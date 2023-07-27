<template>
	<v-notice type="danger" icon="warning" class="sms-notice" v-if="TWILIO_ACCOUNT_SID === undefined || TWILIO_PHONE_NUMBER === undefined">Twilio API Details Missing</v-notice>
	<div v-else class="twilio-sms" :class="{ 'has-header': showHeader }">
		<!-- Content goes here -->
		<v-input v-model="recipient" placeholder="+0000000000" v-if="phone_number_field == ''"/>
		<v-select
			v-else-if="!batch_send"
			multiple
			:model-value="recipients"
			:items="contacts"
			:show-deselect="true"
			placeholder="Select contacts"
			:allow-other="true"
			:close-on-content-click="false"
			:multiple-preview-threshold="3"
			:value="recipients"
			@update:model-value="updateNumbers($event)"
		></v-select>
		<v-textarea class="custom-message" v-model="custom_message" v-if="message == null"></v-textarea>
		<v-dialog v-model="smsConfirmation" @esc="smsConfirmation = false;refresh()">
			<template #activator="{ on }">
				<v-button @click="on" v-if="recipients != undefined && recipients.length > 0 && (message || custom_message != '')">
					{{ button_label }}
				</v-button>
				<v-button v-else secondary disabled>{{ button_label }}</v-button>
			</template>
			<v-sheet v-if="recipients != undefined">
				<h2 v-if="sms_sent === 0" class="sms-confirm">Send the following message to {{ recipients.length }} recipients?</h2>
				<blockquote v-if="sms_sent === 0" class="sms-message" v-html="message?message:custom_message"></blockquote>
				<v-notice type="danger" icon="warning" v-if="sms_error.length > 0">There was an issue sending {{ sms_error.length }} message{{ sms_error.length > 1?'s':'' }}.</v-notice>
				<v-notice type="success" icon="done" v-if="sms_sent > 0">{{ sms_sent }} message{{ sms_sent > 1?'s':'' }} successfully.</v-notice>
				<div class="sms-actions" >
					<v-button v-if="sms_sent === 0" secondary @click="smsConfirmation = false">Cancel</v-button> <v-button v-if="sms_sent === 0" @click="sendSMS()">Confirm</v-button>
					<v-button v-if="sms_sent > 0"  @click="smsConfirmation = false;SMSReset()">Done</v-button>
				</div>
			</v-sheet>
		</v-dialog>
	</div>
</template>

<script>
import { useApi } from '@directus/extensions-sdk';
import { ref, watch } from 'vue';
export default {
	props: {
		showHeader: {
			type: Boolean,
			default: false,
		},
		button_label: {
			type: String,
			default: '',
		},
		collection: {
			type: String,
			default: '',
		},
		phone_number_field: {
			type: String,
			default: '',
		},
		message: {
			type: String,
			default: null,
		},
		filter: {
			type: Object,
			default: () => ({}),
		},
		batch_send: {
			type: Boolean,
			default: false,
		},
		displayTemplate: {
			type: String,
			default: '',
		},
		TWILIO_ACCOUNT_SID: String,
		TWILIO_AUTH_TOKEN: String,
		TWILIO_PHONE_NUMBER: String,
	},
	setup(props){
		const api = useApi();
		const custom_message = ref('');
		const smsConfirmation = ref(false);
		const recipient = ref('');
		const recipients = ref([]);
		const contacts = ref([]);
		const sms_sent = ref(0);
		const sms_error = ref([]);
		const fields = ref([]);
		const template_fields = ref([]);
		const twilio_sid = props.TWILIO_ACCOUNT_SID;
		const twilio_from = props.TWILIO_PHONE_NUMBER;
		
		async function fetchResults(){
			fields.value = [`${props.phone_number_field}`];
			if(props.displayTemplate != null){
				template_fields.value = props.displayTemplate.match(/(\{\{[\s]*.*?[\s]*\}\})/g);
			}

			if(template_fields.value != null){
				template_fields.value.forEach(field => {
					field = field.replace('{{ ','').replace(' }}','');
					fields.value.push(field);
				});
			}

			try {
				contacts.value = [];
				const query = await api.get(
					`/items/${props.collection}`, {
						params: {
							fields: fields.value,
							limit: -1,
							filter: props.filter,
						},
					}
				);

				var res = query.data.data;

				res.forEach(item => {
					contacts.value.push({
						text: displayOutput(item),
						value: item[props.phone_number_field],
					});

					if(props.batch_send){
						recipients.value.push(item[props.phone_number_field]);
					}
				});
				
			} catch (err) {
				console.warn(err);
			}
		}

		fetchResults();

		watch(() => [props.collection, props.filter, props.phone_number_field, props.displayTemplate], () => {
			console.log("Setting Changes");
			fetchResults();
		});

		return { contacts, recipient, recipients, custom_message, smsConfirmation, sendSMS, updateNumbers, SMSReset, sms_sent, sms_error };

		function displayOutput(item){
			let output = props.displayTemplate;
			if(template_fields.value != null){
				template_fields.value.forEach(field => {
					var clean = field.replace('{{ ','').replace(' }}','');
					output = output.replace(field, parseValue(item, clean));
				});
			}
			return output;
		}

		function parseValue(item, key){
			if(key.includes(".")){
				let value = item;
				let fields = key.split('.');
				
				fields.forEach(f => {
					if(value != null){
						value = value[f];
					}
				});

				return value;
			} else {
				return item[key]
			}
		}

		function updateNumbers(value){
			recipients.value = value;
			return;
		}

		function sendSMS(){
			sms_sent.value = 0;
			sms_error.value = [];
			let sms_body = props.message?props.message:custom_message.value;
			let sms_recpients = recipients.value;
			if(recipient.value != ''){
				sms_recpients.push(recipient.value);
			}

			sms_recpients.forEach(sms_to => {
				api.post(`/twilio/2010-04-01/Accounts/${twilio_sid}/Messages.json`, {
					From: twilio_from,
					Body: sms_body,
					To: sms_to,
				}).then((rsp) => {
					if(rsp.data.status == "queued"){
						sms_sent.value += 1;
					} else {
						sms_error.value.push({
							recipient: sms_to,
							error: {
								code: rsp.data.code,
								message: rsp.data.message,
							},
						});
					}
					console.log(rsp.data);
				}).catch((error) => {
					sms_error.value.push({
						recipient: sms_to,
						error: error,
					});
					console.log(error);
				});
			});

			return;
		}

		function SMSReset(){
			if(!props.batch_send){
				recipients.value = [];
			}
			recipient.value = '';
			custom_message.value = '';
			return;
		}
	},
};
</script>

<style scoped>
.twilio-sms {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 0 1em 1em;
}

.custom-message {
	flex-grow: 1;
	margin: 1em 0;
	max-height: none;
}

.sms-confirm {
	font-weight: bold;
	font-size: 1.3em;
}

.sms-message {
	padding: var(--input-padding);
	border-radius: var(--border-radius);
	border: var(--border-width) solid var(--border-normal);
	margin: 1em 0;
}

.sms-actions {
	text-align: right;
}

.sms-notice {
	margin: 0 1em;
}
</style>



