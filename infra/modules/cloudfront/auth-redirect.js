function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var cookies = request.cookies;

    var protectedPrefixes = [
        '/meus-bots', '/pedidos', '/produtos', '/settings',
        '/pagamentos', '/analytics', '/suporte', '/bots',
        '/whatsapp-callback'
    ];

    var isProtected = false;
    for (var i = 0; i < protectedPrefixes.length; i++) {
        var prefix = protectedPrefixes[i];
        if (uri === prefix || uri.indexOf(prefix + '/') === 0) {
            isProtected = true;
            break;
        }
    }

    var hasPresenceCookie = cookies['zenbots_auth'] && cookies['zenbots_auth'].value;
    var hasAccessToken = cookies['access_token'] && cookies['access_token'].value;
    if (isProtected && (!hasPresenceCookie || !hasAccessToken)) {
        return {
            statusCode: 302,
            statusDescription: 'Found',
            headers: {
                'location': { value: '/login?redirect=' + encodeURIComponent(uri) }
            }
        };
    }

    // Next.js 16 static export generates /route.html (not /route/index.html)
    // No root page exists — redirect "/" to "/login"
    if (uri === '/' || uri === '') {
        return {
            statusCode: 302,
            statusDescription: 'Found',
            headers: {
                'location': { value: '/login' }
            }
        };
    }

    if (!uri.includes('.')) {
        // Remove trailing slash if present, then add .html
        var cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
        request.uri = cleanUri + '.html';
    }

    return request;
}
