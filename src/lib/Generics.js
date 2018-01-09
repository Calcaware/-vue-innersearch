import Vue from 'vue';
import elasticsearch from 'elasticsearch';
import Bodybuilder from 'bodybuilder';
import Store from './store';

export default Vue.mixin({
	computed : {
		// Full Elasticsearch request
		request : function() {
			return Object.assign({
				index : this.header.index,
				type : this.header.type
			}, {
				body : this.body
			});
		},

		// Request header (index, type, client)
		header : () => {
			return Store.getters["Elasticsearch/getHeader"];
		},

		// Request query (generated bodybuilder json request)
		body : () => {
			return Store.getters["Elasticsearch/getBody"];
		},

		// Instructions (contains bodybuilder functions)
		instructions : () => {
			return Store.getters["Elasticsearch/getInstructions"];
		}
	},

	methods : {
		/*
			Store Elasticsearch Header Setters
		*/
		setHost : (host) => {
			Store.commit("Elasticsearch/setHost", new elasticsearch.Client({ host }));
		},
		setIndex : (index) => {
			Store.commit("Elasticsearch/setIndex", index);
		},
		setType : (type) => {
			Store.commit("Elasticsearch/setType", type);
		},


		/*
			Store Elasticsearch Body Setter
		*/
		setBody : (type) => {
			Store.commit("Elasticsearch/setBody", type);
		},


		/*
			Store Elasticsearch Instructions Add
		*/
		addInstruction : (obj) => {
			Store.commit("Elasticsearch/addInstruction", obj);
		},


		/*
			Store Elasticsearch Instructions Remove
		*/
		removeInstruction : (obj) => {
			Store.commit("Elasticsearch/removeInstruction", obj);
		},


		/*
			Mount full request
		*/
		mount : function() {
			// Bodybuilder object
			let BD = Bodybuilder().from(0).size(10);

			// Execute all instructions to create request
			this.instructions.forEach(instr => {
				//console.log("[Generics:Mount] Instr Args : ", instr.args);
				BD[instr.fun](...instr.args);
			});

			// Store the JSON request into the body
			this.setBody(BD.build());

			// Debug
			//console.log("[Generics:Mount] Body : ", Store.getters.getBody);
			//console.log("[Generics:Mount] Request : ", this.request);
		},


		/*
			Execute ES request
		*/
		fetch : function() {
			//console.log("[Generics:Fetch] Request : ", this.request);

			// Fetch the hits
			this.header.client.search(this.request).then(function (resp) {
				Store.commit("Reset");
				var hits = resp.hits.hits;
				//console.log("Debug Hits : ", resp);
				if (hits.length === 0) {
					Store.commit("Score", 0);
				}
				else {
					var score = 0;
					hits.forEach((obj) => {
					score++;
					Store.commit("Item", obj);
					});
					Store.commit("Score", resp.hits.total);
				}
			}, function (err) {
				Store.commit("Score", 0);
			});

			// Debug
			//console.log("[Generics:Fetch] Work : ", "done");
		},


		// field name of the aggs that we want to fetch
		createRequestForAggs : function (field) {
			// Bodybuilder object
			let _request = this.clone(this.request);

			// Store the JSON request into the body
			_request.body = Bodybuilder()
				.size(0)
				.aggregation("terms",field)
				.build();

			return _request;
		},

		clone : (object) => {
			return JSON.parse(JSON.stringify(object));
		},

		remove : (object) => {
			delete object.fun;
			delete object.args;
		}
	},

	created : function() {
		this.mount(); // Not optimised
	}
});
