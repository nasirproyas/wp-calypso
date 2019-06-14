/**
 * Global polyfills
 */
import 'boot/polyfills';
import { hydrate, render } from 'controller/web-util';

/**
 * External dependencies
 */
import page from 'page';
/**
 * Internal dependencies
 */
import createStore from './store';
import { setupMiddlewares } from './common';
import initLoginSection from 'login';

// goofy import for environment badge, which is SSR'd
import 'components/environment-badge/style.scss';

// Create Redux store
const store = createStore();

setupMiddlewares( store );

page( '*', ( context, next ) => {
	context.store = store;
	next();
} );

page.exit( '*', ( context, next ) => {
	context.store = store;
	next();
} );

initLoginSection( ( route, ...handlers ) => page( route, ...handlers, renderHandler ) );
function renderHandler( context, next ) {
	( context.serverSideRender ? hydrate : render )( context );
	next();
}

window.AppBoot = () => {
	page.start();
};
