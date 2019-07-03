/** @format */
/**
 * External dependencies
 */
import { connect } from 'react-redux';
import page from 'page';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Gridicon from 'gridicons';
import { localize, moment } from 'i18n-calypso';
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import Dialog from 'components/dialog';
import wpcom from 'lib/wp';
import config from 'config';
import Button from 'components/button';
import CompactCard from 'components/card/compact';
import CancelPurchaseForm from 'components/marketing-survey/cancel-purchase-form';
import enrichedSurveyData from 'components/marketing-survey/cancel-purchase-form/enriched-survey-data';
import GSuiteCancellationPurchaseDialog from 'components/marketing-survey/gsuite-cancel-purchase-dialog';
import { getIncludedDomain, getName, hasIncludedDomain, isRemovable } from 'lib/purchases';
import { isDataLoading } from '../utils';
import { isDomainRegistration, isGoogleApps, isJetpackPlan, isPlan } from 'lib/products-values';
import notices from 'notices';
import { purchasesRoot } from '../paths';
import { getPurchasesError } from 'state/purchases/selectors';
import { removePurchase } from 'state/purchases/actions';
import hasActiveHappychatSession from 'state/happychat/selectors/has-active-happychat-session';
import isHappychatAvailable from 'state/happychat/selectors/is-happychat-available';
import FormSectionHeading from 'components/forms/form-section-heading';
import isDomainOnly from 'state/selectors/is-domain-only-site';
import isSiteAutomatedTransfer from 'state/selectors/is-site-automated-transfer';
import { receiveDeletedSite } from 'state/sites/actions';
import { setAllSitesSelected } from 'state/ui/actions';
import { recordTracksEvent } from 'state/analytics/actions';
import HappychatButton from 'components/happychat/button';
import isPrecancellationChatAvailable from 'state/happychat/selectors/is-precancellation-chat-available';
import { getCurrentUserId } from 'state/current-user/selectors';
import RemoveDomainDialog from './remove-domain-dialog';

/**
 * Style dependencies
 */
import './style.scss';

/**
 * Module dependencies
 */
import debugFactory from 'debug';
const debug = debugFactory( 'calypso:purchases:survey' );

class RemovePurchase extends Component {
	static propTypes = {
		hasLoadedUserPurchasesFromServer: PropTypes.bool.isRequired,
		isDomainOnlySite: PropTypes.bool,
		receiveDeletedSite: PropTypes.func.isRequired,
		removePurchase: PropTypes.func.isRequired,
		purchase: PropTypes.object,
		site: PropTypes.object,
		setAllSitesSelected: PropTypes.func.isRequired,
		userId: PropTypes.number.isRequired,
	};

	state = {
		isDialogVisible: false,
		isRemoving: false,
		survey: {},
	};

	recordChatEvent( eventAction ) {
		const { purchase } = this.props;
		this.props.recordTracksEvent( eventAction, {
			survey_step: this.state.surveyStep,
			purchase: purchase.productSlug,
			is_plan: isPlan( purchase ),
			is_domain_registration: isDomainRegistration( purchase ),
			has_included_domain: hasIncludedDomain( purchase ),
		} );
	}

	recordEvent = ( name, properties = {} ) => {
		const product_slug = get( this.props, [ 'purchase', 'productSlug' ] );
		const cancellation_flow = 'remove';
		const is_atomic = this.props.isAtomicSite;
		this.props.recordTracksEvent(
			name,
			Object.assign( { cancellation_flow, product_slug, is_atomic }, properties )
		);
	};

	closeDialog = () => {
		this.recordEvent( 'calypso_purchases_cancel_form_close' );
		this.setState( {
			isDialogVisible: false,
		} );
	};

	chatInitiated = () => {
		this.recordEvent( 'calypso_purchases_cancel_form_chat_initiated' );
		this.closeDialog();
	};

	openDialog = event => {
		this.recordEvent( 'calypso_purchases_cancel_form_start' );
		event.preventDefault();

		this.setState( { isDialogVisible: true } );
	};

	chatButtonClicked = event => {
		this.recordChatEvent( 'calypso_precancellation_chat_click' );
		event.preventDefault();

		this.setState( { isDialogVisible: false } );
	};

	onStepChange = newStep => {
		this.recordEvent( 'calypso_purchases_cancel_survey_step', { new_step: newStep } );
	};

	onSurveyChange = update => {
		this.setState( {
			survey: update,
		} );
	};

	removePurchase = closeDialog => {
		this.setState( { isRemoving: true } );

		const { isDomainOnlySite, purchase, site, translate } = this.props;

		if ( ! isDomainRegistration( purchase ) && ! isGoogleApps( purchase ) ) {
			const survey = wpcom
				.marketing()
				.survey( 'calypso-remove-purchase', this.props.purchase.siteId );
			const surveyData = {
				'why-cancel': {
					response: this.state.survey.questionOneRadio,
					text: this.state.survey.questionOneText,
				},
				'next-adventure': {
					response: this.state.survey.questionTwoRadio,
					text: this.state.survey.questionTwoText,
				},
				'what-better': { text: this.state.survey.questionThreeText },
				type: 'remove',
			};

			survey.addResponses( enrichedSurveyData( surveyData, moment(), site, purchase ) );

			debug( 'Survey responses', survey );
			survey
				.submit()
				.then( res => {
					debug( 'Survey submit response', res );
					if ( ! res.success ) {
						notices.error( res.err );
					}
				} )
				.catch( err => debug( err ) ); // shouldn't get here
		}

		this.recordEvent( 'calypso_purchases_cancel_form_submit' );

		this.props.removePurchase( purchase.id, this.props.userId ).then( () => {
			const productName = getName( purchase );
			const { purchasesError } = this.props;

			if ( purchasesError ) {
				this.setState( { isRemoving: false } );

				closeDialog();

				notices.error( purchasesError );
			} else {
				if ( isDomainRegistration( purchase ) ) {
					if ( isDomainOnlySite ) {
						this.props.receiveDeletedSite( purchase.siteId );
						this.props.setAllSitesSelected();
					}

					notices.success(
						translate( 'The domain {{domain/}} was removed from your account.', {
							components: { domain: <em>{ productName }</em> },
						} ),
						{ persistent: true }
					);
				} else {
					notices.success(
						translate( '%(productName)s was removed from {{siteName/}}.', {
							args: { productName },
							components: { siteName: <em>{ purchase.domain }</em> },
						} ),
						{ persistent: true }
					);
				}

				page( purchasesRoot );
			}
		} );
	};

	// TODO:
	// Extract this button out as a reusable component, sharing it with <CancelPurchaseForm/>,
	// and add the chat button back to non-happychat steps.
	getChatButton = () => {
		return (
			<HappychatButton className="remove-purchase__chat-button" onClick={ this.chatButtonClicked }>
				{ this.props.translate( 'Need help? Chat with us' ) }
			</HappychatButton>
		);
	};

	getContactUsButton = () => {
		return (
			<Button className="remove-purchase__support-link-button" href="/help/contact/">
				{ this.props.translate( 'Contact Us' ) }
			</Button>
		);
	};

	renderDomainDialog() {
		let chatButton = null;

		if (
			config.isEnabled( 'upgrades/precancellation-chat' ) &&
			this.state.surveyStep !== 'happychat_step'
		) {
			chatButton = this.getChatButton();
		}

		return (
			<RemoveDomainDialog
				isRemoving={ this.state.isRemoving }
				isDialogVisible={ this.state.isDialogVisible }
				removePurchase={ this.removePurchase }
				closeDialog={ this.closeDialog }
				chatButton={ chatButton }
				purchase={ this.props.purchase }
			/>
		);
	}

	renderPlanDialogText() {
		const { purchase, translate } = this.props;
		const productName = getName( purchase );
		const includedDomainText = (
			<p>
				{ translate(
					'The domain associated with this plan, {{domain/}}, will not be removed. ' +
						'It will remain active on your site, unless also removed.',
					{ components: { domain: <em>{ getIncludedDomain( purchase ) }</em> } }
				) }
			</p>
		);

		return (
			<div>
				<p>
					{ translate( 'Are you sure you want to remove %(productName)s from {{domain/}}?', {
						args: { productName },
						components: { domain: <em>{ purchase.domain }</em> },
						// ^ is the internal WPcom domain i.e. example.wordpress.com
						// if we want to use the purchased domain we can swap with the below line
						//{ components: { domain: <em>{ getIncludedDomain( purchase ) }</em> } }
					} ) }{' '}
					{ isGoogleApps( purchase )
						? translate(
								'Your G Suite account will continue working without interruption. ' +
									'You will be able to manage your G Suite billing directly through Google.'
						  )
						: translate(
								'You will not be able to reuse it again without purchasing a new subscription.',
								{ comment: "'it' refers to a product purchased by a user" }
						  ) }
				</p>

				{ isPlan( purchase ) && hasIncludedDomain( purchase ) && includedDomainText }
			</div>
		);
	}

	renderAtomicDialog( purchase ) {
		const { translate } = this.props;
		const supportButton = this.state.isChatAvailable
			? this.getChatButton()
			: this.getContactUsButton();

		const buttons = [
			supportButton,
			{
				action: 'cancel',
				disabled: this.state.isRemoving,
				isPrimary: true,
				label: translate( "I'll Keep It" ),
			},
		];
		const productName = getName( purchase );

		return (
			<Dialog
				buttons={ buttons }
				className="remove-purchase__dialog"
				isVisible={ this.state.isDialogVisible }
				onClose={ this.closeDialog }
			>
				<FormSectionHeading />
				<p>
					{ translate(
						'To cancel your %(productName)s plan, please contact our support team' +
							' — a Happiness Engineer will take care of it.',
						{
							args: { productName },
						}
					) }
				</p>
			</Dialog>
		);
	}

	renderDialog( purchase ) {
		if ( this.props.isAtomicSite ) {
			return this.renderAtomicDialog( purchase );
		}

		if ( isDomainRegistration( purchase ) ) {
			return this.renderDomainDialog();
		}

		if ( isGoogleApps( purchase ) ) {
			return (
				<GSuiteCancellationPurchaseDialog
					isVisible={ this.state.isDialogVisible }
					onClose={ this.closeDialog }
					purchase={ purchase }
					site={ this.props.site }
				/>
			);
		}

		return this.renderPlanDialog();
	}

	render() {
		if ( isDataLoading( this.props ) ) {
			return null;
		}

		// If we have a disconnected site that is _not_ a Jetpack purchase, no removal allowed.
		if ( ! this.props.site && ! this.props.isJetpack ) {
			return null;
		}

		const { purchase, translate } = this.props;
		const productName = getName( purchase );

		if ( ! isRemovable( purchase ) ) {
			return null;
		}

		return (
			<>
				<CompactCard tagName="button" className="remove-purchase__card" onClick={ this.openDialog }>
					<Gridicon icon="trash" />
					{ translate( 'Remove %(productName)s', { args: { productName } } ) }
				</CompactCard>
				<CancelPurchaseForm
					chatInitiated={ this.chatInitiated }
					defaultContent={ this.renderPlanDialogText() }
					onInputChange={ this.onSurveyChange }
					purchase={ purchase }
					selectedSite={ this.props.site }
					isVisible={ this.state.isDialogVisible }
					onClose={ this.closeDialog }
					onStepChange={ this.onStepChange }
					onClickFinalConfirm={ this.removePurchase }
					flowType="remove"
				/>
			</>
		);
	}
}

export default connect(
	( state, { purchase } ) => {
		const isJetpack = purchase && isJetpackPlan( purchase );
		return {
			isDomainOnlySite: purchase && isDomainOnly( state, purchase.siteId ),
			isAtomicSite: isSiteAutomatedTransfer( state, purchase.siteId ),
			isChatAvailable: isHappychatAvailable( state ),
			isChatActive: hasActiveHappychatSession( state ),
			isJetpack,
			purchasesError: getPurchasesError( state ),
			precancellationChatAvailable: isPrecancellationChatAvailable( state ),
			userId: getCurrentUserId( state ),
		};
	},
	{
		receiveDeletedSite,
		recordTracksEvent,
		removePurchase,
		setAllSitesSelected,
	}
)( localize( RemovePurchase ) );
