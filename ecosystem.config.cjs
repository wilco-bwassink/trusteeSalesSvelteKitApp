module.exports = {
	apps: [
		{
			name: 'trustee',
			script: 'build/index.js',
			env: {
				PORT: '3002',
				ORIGIN: 'http://dev.wilco.org',
				BODY_SIZE_LIMIT: '25M'
			}
		}
	]
};
