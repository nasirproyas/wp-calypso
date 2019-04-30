/** @format */
/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';

/**
 * Internal dependencies
 */
import DialogBase from './dialog-base';

class Dialog extends Component {
	static propTypes = {
		isVisible: PropTypes.bool,
		baseClassName: PropTypes.string,
		leaveTimeout: PropTypes.number,
		onClose: PropTypes.func,
		shouldCloseOnEsc: PropTypes.bool,
	};

	static defaultProps = {
		isVisible: false,
		leaveTimeout: 200,
	};

	render() {
		return <DialogBase { ...this.props } onDialogClose={ this.onDialogClose } />;
	}

	onDialogClose = action => {
		if ( this.props.onClose ) {
			this.props.onClose( action );
		}
	};
}

export default Dialog;
