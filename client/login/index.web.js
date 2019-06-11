/**
 * External dependencies
 */
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';

/**
 * Internal dependencies
 */
import config from 'config';
import {
	lang,
	login,
	magicLogin,
	magicLoginUse,
	redirectJetpack,
	redirectDefaultLocale,
} from './controller';
import { setShouldServerSideRenderLogin } from './ssr';
import { setUpLocale, setSection, makeLayoutMiddleware } from 'controller/shared';
import { redirectLoggedIn } from 'controller/web-util';
import LayoutLoggedOut from 'layout/logged-out';

export const LOGIN_SECTION_DEFINITION = {
	name: 'login',
	paths: [ '/log-in' ],
	module: 'login',
	enableLoggedOut: true,
	secondary: false,
	isomorphic: true,
};

const ReduxWrappedLayout = ( { store, primary, secondary, redirectUri } ) => {
	return (
		<ReduxProvider store={ store }>
			<LayoutLoggedOut primary={ primary } secondary={ secondary } redirectUri={ redirectUri } />
		</ReduxProvider>
	);
};

const makeLayout = makeLayoutMiddleware( ReduxWrappedLayout );

export default router => {
	if ( config.isEnabled( 'login/magic-login' ) ) {
		router(
			`/log-in/link/use/${ lang }`,
			setUpLocale,
			setSection( LOGIN_SECTION_DEFINITION ),
			redirectLoggedIn,
			magicLoginUse,
			makeLayout
		);

		router(
			`/log-in/link/${ lang }`,
			setUpLocale,
			setSection( LOGIN_SECTION_DEFINITION ),
			redirectLoggedIn,
			magicLogin,
			makeLayout
		);
	}

	if ( config.isEnabled( 'login/wp-login' ) ) {
		router(
			[
				`/log-in/:twoFactorAuthType(authenticator|backup|sms|push)/${ lang }`,
				`/log-in/:flow(social-connect|private-site)/${ lang }`,
				`/log-in/:socialService(google)/callback/${ lang }`,
				`/log-in/:isJetpack(jetpack)/${ lang }`,
				`/log-in/${ lang }`,
			],
			redirectJetpack,
			redirectDefaultLocale,
			setUpLocale,
			setSection( LOGIN_SECTION_DEFINITION ),
			login,
			setShouldServerSideRenderLogin,
			makeLayout
		);
	}
};
