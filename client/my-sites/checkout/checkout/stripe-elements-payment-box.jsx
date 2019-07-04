/** @format */

/**
 * External dependencies
 */
import { loadScript } from '@automattic/load-script';
import debugFactory from 'debug';
import React, { useEffect, useState } from 'react';
import { localize } from 'i18n-calypso';
import { StripeProvider, Elements, injectStripe, CardElement } from 'react-stripe-elements';

/**
 * Internal dependencies
 */
import notices from 'notices';
import wpcom from 'lib/wp';
import { paymentMethodClassName } from 'lib/cart-values';
import { hasRenewableSubscription } from 'lib/cart-values/cart-items';
import TermsOfService from './terms-of-service';
import DomainRegistrationRefundPolicy from './domain-registration-refund-policy';
import DomainRegistrationAgreement from './domain-registration-agreement';

const debug = debugFactory( 'calypso:stripe-elements-payment-box' );

// TODO: move this to somewhere else
const stripeJsUrl = 'https://js.stripe.com/v3/';
// TODO: move this to somewhere else
const stripeApiKey = 'pk_test_12345';

function useStripeJs( url, apiKey ) {
	const [ stripeJs, setStripeJs ] = useState( null );
	useEffect( () => {
		if ( window.Stripe ) {
			debug( 'stripe.js already loaded' );
			setStripeJs( window.Stripe( apiKey ) );
			return;
		}
		debug( 'loading stripe.js...' );
		loadScript( url, function( error ) {
			if ( error ) {
				debug( 'stripe.js script ' + error.src + ' failed to load.' );
				return;
			}
			debug( 'stripe.js loaded!' );
			setStripeJs( window.Stripe( apiKey ) );
		} );
	}, [ url, apiKey ] );
	return stripeJs;
}

async function submitPaymentForm( { stripe, paymentDetails, cart, transaction } ) {
	const stripePaymentMethod = await createStripePaymentMethod( stripe, paymentDetails );
	return sendStripePaymentMethodToStore( {
		cart,
		transaction,
		paymentDetails,
		stripePaymentMethod,
	} );
}

async function createStripePaymentMethod( stripe, paymentDetails ) {
	debug( 'creating payment method...', paymentDetails );
	const { paymentMethod, error } = await stripe.createPaymentMethod( 'card', {
		billing_details: paymentDetails,
	} );
	debug( 'payment method creation complete', paymentMethod, error );
	if ( error ) {
		// Note that this is a promise rejection
		throw new Error( error.message );
	}
	return paymentMethod;
}

async function sendStripePaymentMethodToStore( {
	cart,
	transaction,
	paymentDetails,
	stripePaymentMethod,
} ) {
	const dataForApi = {
		stripePaymentMethod, // TODO: the API does not accept this yet
		payment: Object.assign( {}, paymentDetails, {
			paymentMethod: paymentMethodClassName( 'stripe' ),
			successUrl: '/',
			cancelUrl: '/',
		} ),
		cart,
		domain_details: transaction.domainDetails,
	};

	return wpcom.undocumented().transactions( 'POST', dataForApi );
}

function StripeElementsForm( { translate, stripe, cart, transaction, children } ) {
	const [ cardholderName, setCardholderName ] = useState( '' );
	const onNameChange = event => setCardholderName( event.target.value );
	const handleSubmit = event => {
		event.preventDefault();
		submitPaymentForm( {
			stripe,
			cart,
			transaction,
			paymentDetails: {
				name: cardholderName,
			},
		} )
			.then( result => {
				if ( result.redirect_url ) {
					notices.success(
						translate( 'Redirecting you to the payment partner to complete the payment.' )
					);
					window.location.href = result.redirect_url;
				}
				// TODO: what if there is no redirect_url?
			} )
			.catch( error => {
				const errorMessage =
					error.message || translate( "We've encountered a problem. Please try again later." );
				notices.error( errorMessage );
			} );
	};
	const cardholderNameLabel = translate( 'Cardholder Name {{span}}(as written on card){{/span}}', {
		comment: 'Cardholder name label on credit card form',
		components: {
			// eslint-disable-next-line wpcalypso/jsx-classname-namespace
			span: <span className="credit-card-form-fields__explainer" />,
		},
	} );
	const cardDetailsLabel = translate( 'Card Details' );
	const payButtonLabel = translate( 'Pay %(price)s', {
		args: {
			price: cart.total_cost_display,
		},
	} );

	/* eslint-disable jsx-a11y/label-has-associated-control */
	// TODO: add country
	// TODO: add subscription length toggle
	// TODO: add chat help link
	return (
		<form onSubmit={ handleSubmit }>
			<div>
				<label>
					{ cardholderNameLabel }
					<input
						type="text"
						placeholder="Jane Doe"
						value={ cardholderName }
						onChange={ onNameChange }
						required
					/>
				</label>
				<label>
					{ cardDetailsLabel }
					<CardElement />
				</label>
				<button className="stripe-elements-payment-box__pay-button">{ payButtonLabel }</button>
			</div>

			{ children }

			<TermsOfService hasRenewableSubscription={ hasRenewableSubscription( cart ) } />
			<DomainRegistrationRefundPolicy cart={ cart } />
			<DomainRegistrationAgreement cart={ cart } />
		</form>
	);
	/* eslint-enable jsx-a11y/label-has-associated-control */
}

const InjectedStripeElementsForm = injectStripe( StripeElementsForm );

export function StripeElementsPaymentBox( { translate, cart } ) {
	const stripeJs = useStripeJs( stripeJsUrl, stripeApiKey );
	return (
		<StripeProvider stripe={ stripeJs }>
			<Elements>
				<InjectedStripeElementsForm translate={ translate } cart={ cart } />
			</Elements>
		</StripeProvider>
	);
}

export default localize( StripeElementsPaymentBox );
