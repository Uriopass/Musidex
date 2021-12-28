import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		api_url: "",
	},
	migrations: [
		OptionsSync.migrations.removeUnused,
	],
	logging: true,
});
