FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Crear directorio para la base de datos
RUN mkdir -p db

# Exponer el puerto que usa la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
