/**
 * External dependencies
 */
import React, { Component } from 'react';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import hasInitializedSites from 'state/selectors/has-initialized-sites';
import SiteTypeForm from './form';
import StepWrapper from 'signup/step-wrapper';
import { getSiteType } from 'state/signup/steps/site-type/selectors';
import { submitSiteType } from 'state/signup/steps/site-type/actions';
import { saveSignupStep } from 'state/signup/progress/actions';

// Override
const siteTypeToFlowname = {
	'online-store': 'ecommerce-onboarding',
	blog: {
		business: 'business-blog',
		free: 'free-blog',
		onboarding: 'onboarding-blog',
		personal: 'personal-blog',
		premium: 'premium-blog',
	},
};

class SiteType extends Component {
	componentDidMount() {
		this.props.saveSignupStep( { stepName: this.props.stepName } );
	}

	submitStep = siteTypeValue => {
		this.props.submitSiteType( siteTypeValue );

		const nextFlow = this.getNextFlow( siteTypeValue );

		this.props.goToNextStep( nextFlow );
	};

	getNextFlow = siteTypeValue => {
		const flowOverride = siteTypeToFlowname[ siteTypeValue ];
		if ( ! flowOverride ) {
			return this.props.flowName;
		} else if ( typeof flowOverride === 'string' ) {
			return flowOverride;
		}

		return flowOverride[ this.props.flowName ];
	};

	render() {
		const {
			flowName,
			positionInFlow,
			signupProgress,
			siteType,
			stepName,
			translate,
			hasInitializedSitesBackUrl,
		} = this.props;

		const headerText = translate( 'What kind of site are you building?' );
		const subHeaderText = translate(
			'This is just a starting point. You can add or change features later.'
		);

		return (
			<StepWrapper
				flowName={ flowName }
				stepName={ stepName }
				positionInFlow={ positionInFlow }
				headerText={ headerText }
				fallbackHeaderText={ headerText }
				subHeaderText={ subHeaderText }
				fallbackSubHeaderText={ subHeaderText }
				signupProgress={ signupProgress }
				stepContent={ <SiteTypeForm submitForm={ this.submitStep } siteType={ siteType } /> }
				allowBackFirstStep={ !! hasInitializedSitesBackUrl }
				backUrl={ hasInitializedSitesBackUrl }
				backLabelText={ hasInitializedSitesBackUrl ? translate( 'Back to My Sites' ) : null }
			/>
		);
	}
}

export default connect(
	state => ( {
		siteType: getSiteType( state ) || 'blog',
		hasInitializedSitesBackUrl: hasInitializedSites( state ) ? '/sites/' : false,
	} ),
	{ saveSignupStep, submitSiteType }
)( localize( SiteType ) );
