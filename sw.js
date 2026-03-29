var CACHE = 'financas-v1';
var ARQUIVOS = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Instalacao: salva arquivos em cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ARQUIVOS);
    })
  );
  self.skipWaiting();
});

// Ativacao: limpa caches antigos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Requisicoes: rede primeiro, fallback para cache
// Chamadas ao JSONBin sempre vao para a rede (dados em tempo real)
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // JSONBin e APIs externas: sempre rede, sem cache
  if (url.includes('jsonbin.io') || url.includes('api.')) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response(JSON.stringify({error:'offline'}), {
        headers: {'Content-Type': 'application/json'}
      });
    }));
    return;
  }

  // Demais recursos: rede primeiro, cache como fallback
  e.respondWith(
    fetch(e.request)
      .then(function(resp) {
        // Salva copia no cache se for resposta valida
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      })
      .catch(function() {
        // Sem internet: usa cache
        return caches.match(e.request).then(function(cached) {
          return cached || new Response('Sem conexao. Abra o app com internet primeiro.', {
            status: 503,
            headers: {'Content-Type': 'text/plain'}
          });
        });
      })
  );
});
