# Guía de Implementación del Backend para resumenes-IA

Esta guía explica cómo implementar y desplegar el backend desarrollado para la aplicación "resumenes-IA", que reemplaza el uso de localStorage por una base de datos SQLite y proporciona una API RESTful.

## Estructura del Proyecto

```
resumenes-ia/
├── backend/
│   ├── config/
│   │   └── config.json
│   ├── models/
│   │   └── database.js
│   ├── db/
│   │   └── notebooks.sqlite (se creará automáticamente)
│   ├── app.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js (modificado para usar la API)
└── docker-compose.yml
```

## Archivos Desarrollados

1. **app.js**: Implementación de la API RESTful con Express
2. **models/database.js**: Configuración y conexión a la base de datos SQLite
3. **config/config.json**: Configuración para entornos de desarrollo y producción
4. **package.json**: Dependencias y scripts para el backend
5. **Dockerfile**: Configuración para construir la imagen Docker del backend
6. **docker-compose.yml**: Orquestación de servicios (backend, frontend)
7. **frontend-integration.js**: Código de ejemplo para integrar el frontend con la API

## Endpoints de la API

- **GET /notebooks**: Devuelve todos los notebooks con sus clases
- **POST /notebooks**: Agrega una nueva clase a un notebook (lo crea si no existe)
- **PUT /notebooks/:nombre/:index**: Edita una clase específica
- **DELETE /notebooks/:nombre/:index**: Elimina una clase específica

## Integración con el Frontend

Para integrar el frontend con el backend, debes modificar las funciones que actualmente usan localStorage para que utilicen fetch() y se comuniquen con la API. En el archivo `frontend-integration.js` encontrarás ejemplos de cómo implementar estas modificaciones.

## Despliegue con Docker

1. Coloca los archivos del frontend en la carpeta `frontend/`
2. Asegúrate de que los archivos del backend estén en la carpeta `backend/`
3. Ejecuta el siguiente comando para construir y levantar los servicios:

```bash
docker-compose up -d
```

4. Accede a la aplicación en http://localhost

## Notas Importantes

- La base de datos SQLite se almacena en un volumen Docker para persistencia
- El backend escucha en el puerto 3000
- El frontend se sirve a través de Apache en el puerto 80
- Asegúrate de modificar las URLs de la API en el frontend si cambias la configuración de puertos

Link de acceso de diapositivas: https://www.canva.com/design/DAGoN6BEDvI/-dIkDjybV1AnrOxSdHumDA/edit?utm_content=DAGoN6BEDvI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
