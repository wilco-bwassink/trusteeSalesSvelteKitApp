module.exports = {
	apps: [
		{
			name: 'trustee',
			script: 'build/index.js',
			env: {
				HOST: '127.0.0.1',
				PORT: '3002',
				ORIGIN: 'http://dev.wilco.org',
				BODY_SIZE_LIMIT: '25M'
			}
		}
	]
};
