import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'app.pulsestack',
	appName: 'Pulse Stack',
	webDir: 'build',
	server: {
		androidScheme: 'https',
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: true,
			backgroundColor: '#05070F',
		},
		StatusBar: {
			style: 'DARK',
			backgroundColor: '#05070F',
		},
	},
};

export default config;
