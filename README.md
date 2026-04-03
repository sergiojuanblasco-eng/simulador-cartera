# Simulador de Cartera - MVP

## Que es esto?
Una calculadora de cartera de inversion que usa rolling returns historicos reales + estimaciones de analistas para proyectar 3 escenarios (pesimista, esperado, optimista).

## Como publicar en Vercel (GRATIS) - Guia paso a paso

### Paso 1: Crear cuenta en GitHub
1. Ve a https://github.com y crea una cuenta (gratis)
2. Una vez dentro, haz click en "New repository" (boton verde arriba a la derecha)
3. Nombre: "simulador-cartera"
4. Deja todo por defecto y click "Create repository"

### Paso 2: Subir los archivos
Opcion A (facil, desde el navegador):
1. En tu nuevo repositorio, click "uploading an existing file"
2. Arrastra TODA la carpeta del proyecto (todos los archivos)
3. Click "Commit changes"

Opcion B (si tienes Git instalado):
```
cd deploy
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/TU_USUARIO/simulador-cartera.git
git push -u origin main
```

### Paso 3: Desplegar en Vercel
1. Ve a https://vercel.com y click "Sign Up" -> "Continue with GitHub"
2. Autoriza Vercel a acceder a tu GitHub
3. Click "New Project"
4. Selecciona tu repositorio "simulador-cartera"
5. Vercel detectara automaticamente que es Vite
6. Click "Deploy"
7. Espera 1-2 minutos. LISTO! Tendras una URL tipo: simulador-cartera.vercel.app

### Paso 4: Conectar tu dominio personalizado
1. En Vercel, ve a tu proyecto -> Settings -> Domains
2. Escribe tu dominio (ej: micartera.io)
3. Vercel te dara los DNS records que necesitas
4. Ve al panel de tu registrador de dominio (Namecheap, GoDaddy, etc.)
5. Anade los DNS records que te dio Vercel
6. Espera 24-48h para propagacion DNS

### Paso 5: Anadir Google Analytics
1. Ve a https://analytics.google.com
2. Crea una cuenta y propiedad
3. Copia el ID de medicion (empieza por G-)
4. Abre index.html y anade antes de </head>:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TU_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-TU_ID');
</script>
```

### Paso 6: Personalizar
- Cambia "tudominio.com" en index.html por tu dominio real
- Crea una imagen og-image.png de 1200x630px para redes sociales
- Personaliza colores/textos en src/App.jsx

## Estructura del proyecto
```
deploy/
  index.html        -> Pagina principal con SEO
  package.json      -> Dependencias (React, Vite)
  vite.config.js    -> Configuracion de Vite
  vercel.json       -> Configuracion de Vercel
  src/
    main.jsx        -> Punto de entrada React
    App.jsx         -> Tu simulador (toda la logica)
```

## Tecnologias
- React 18
- Vite 5
- Sin base de datos (todo en el frontend)
- Hosting: Vercel (gratis)

## Para actualizar datos
Edita los objetos de retornos anuales en src/App.jsx (variable R) y anade el nuevo ano.
Luego push a GitHub y Vercel despliega automaticamente.

## Proximos pasos (V2)
- [ ] Escenario de tension (4o escenario como BlackRock)
- [ ] Analisis con IA
- [ ] Comparador de brokers (MyInvestor, Trade Republic...)
- [ ] Enlaces de afiliacion
- [ ] Mas activos
- [ ] Newsletter
