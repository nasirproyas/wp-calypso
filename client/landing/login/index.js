/**
 * Global polyfills
 */
import 'boot/polyfills';
import { hydrate } from 'controller/web-util';

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

initLoginSection( page );

page( '*', ( context, next ) => {
	hydrate( context );
	next();
} );

window.AppBoot = () => {
	page.start();
};
