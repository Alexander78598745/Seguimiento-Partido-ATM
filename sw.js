// Service Worker para Análisis de Partidos - Atlético de Madrid
// Permite funcionamiento offline de la aplicación

const CACHE_NAME = 'atletico-analyzer-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './escudo_atletico.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Todos los archivos están en cache');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error durante la instalación', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activado y listo');
            return self.clients.claim();
        })
    );
});

// Intercepción de solicitudes de red
self.addEventListener('fetch', event => {
    // Estrategia: Cache First (Cache primero, luego red)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en cache, devolverlo
                if (response) {
                    return response;
                }

                // Si no está en cache, ir a la red
                return fetch(event.request)
                    .then(response => {
                        // Verificar si la respuesta es válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clonar la respuesta
                        const responseToCache = response.clone();

                        // Añadir al cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Error en fetch', error);
                        
                        // Si es una solicitud de navegación y falló, mostrar página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// Manejo de mensajes del cliente
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Sincronización en segundo plano para guardar datos
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Service Worker: Sincronización en segundo plano');
        event.waitUntil(
            // Aquí se pueden sincronizar datos guardados offline cuando vuelva la conexión
            syncData()
        );
    }
});

// Función para sincronizar datos
function syncData() {
    return new Promise((resolve) => {
        // Verificar si hay datos pendientes de sincronización
        const pendingData = localStorage.getItem('pending_sync_data');
        
        if (pendingData) {
            console.log('Service Worker: Sincronizando datos pendientes...');
            // Aquí se enviarían los datos a un servidor si existiera
            // Por ahora solo los mantenemos localmente
            localStorage.removeItem('pending_sync_data');
        }
        
        resolve();
    });
}

// Notificaciones push (para futuras funcionalidades)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Análisis de partido actualizado',
        icon: './escudo_atletico.png',
        badge: './escudo_atletico.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver análisis',
                icon: './escudo_atletico.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: './escudo_atletico.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Atlético Analyzer', options)
    );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

console.log('Service Worker: Cargado correctamente');