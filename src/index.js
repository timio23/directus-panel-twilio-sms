import PanelComponent from './panel.vue';

export default {
	id: 'panel-twilio-sms',
	name: 'Twilio SMS',
	icon: 'forum',
	description: 'Send a SMS from a panel',
	component: PanelComponent,
	options: [
		{
			field: 'TWILIO_PHONE_NUMBER',
			name: 'Twilio Phone Number',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
			},
		},
		{
			field: 'TWILIO_ACCOUNT_SID',
			name: 'Twilio Account SID',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
			},
		},
		{
			field: 'collection',
			type: 'string',
			name: '$t:collection',
			meta: {
				interface: 'system-collection',
				options: {
					includeSystem: true,
					includeSingleton: false,
				},
				width: 'half',
			},
		},
		{
			field: 'phone_number_field',
			type: 'string',
			name: 'Phone Number',
			meta: {
				interface: 'system-field',
				options: {
					collectionField: 'collection',
					typeAllowList: ['string','integer'],
				},
				width: 'half',
			},
		},
		{
			field: 'filter',
			type: 'json',
			name: '$t:filter',
			meta: {
				interface: 'system-filter',
				options: {
					collectionField: 'collection',
					relationalFieldSelectable: false,
				},
			},
		},
		{
			field: 'message',
			type: 'text',
			name: 'Message',
			meta: {
				interface: 'input-multiline',
				width: 'full',
			},
		},
		{
			field: 'button_label',
			name: 'Button Label',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
			},
		},
		{
			field: 'batch_send',
			name: 'Send to All',
			type: 'boolean',
			meta: {
				interface: 'boolean',
				width: 'half',
			},
			schema: {
				default_value: false,
			},
		},
		{
			field: 'displayTemplate',
			name: 'Name in list',
			type: 'string',
			meta: {
				interface: 'system-display-template',
				options: {
					collectionField: 'collection',
					placeholder: '{{ field }}',
				},
				width: 'full',
			},
		},
	],
	minWidth: 12,
	minHeight: 5,
	skipUndefinedKeys: ['displayTemplate'],
};
