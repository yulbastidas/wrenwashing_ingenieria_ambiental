# EcoLupa

Aplicación web en español para consultar evidencia ambiental de productos por código de barras. Requiere Node.js 24. El servidor consulta catálogos abiertos y las preferencias se conservan en localStorage del navegador.

```powershell
npm start
```

En Windows también puedes abrir `Abrir EcoLupa.cmd` con doble clic: inicia el servidor si hace falta y abre el navegador cuando la app responde. Con `npm start`, deja la terminal abierta mientras usas la app. Abre http://localhost:3000. Usa la cámara, ingresa un código manualmente o prueba el informe ficticio de la pantalla principal. El escaneo funciona en localhost (o en HTTPS si adaptas el despliegue); el lector alternativo ZXing se descarga desde jsDelivr cuando el navegador no ofrece detección nativa completa. Los fotogramas se procesan en el dispositivo. Los códigos se consultan en Open Food Facts, Open Beauty Facts y Open Products Facts; se necesita internet. El historial conserva las últimas 100 consultas exitosas (una por código) en localStorage y se puede buscar o borrar.

## IA local opcional

Instala Ollama, inicia su servicio y descarga un modelo local. Por ejemplo, desde PowerShell:

```powershell
ollama pull gemma3:4b
$env:OLLAMA_MODEL = 'gemma3:4b'
npm start
```

Si Ollama está disponible, redacta un resumen a partir de los datos de la ficha. Si no se configura o falla, el informe de reglas sigue disponible. Ollama no hace búsquedas ni verifica sus propias conclusiones.

## Alcance

Green-Score describe el impacto estimado cuando el catálogo publica una calificación compatible. Las etiquetas del catálogo no acreditan la vigencia de un sello; una afirmación pendiente de comprobar no equivale a un hallazgo de greenwashing. La reputación se muestra como no verificada cuando no hay contexto documentado; se incluye un enlace de búsqueda para contrastar fuentes. Para Nutella se incluye la declaración de Ferrero y la evaluación de WWF de 2026 sobre el abastecimiento de aceite de palma. No se emiten acusaciones ni calificaciones generales de reputación.

Datos de los catálogos abiertos de Open Facts (ODbL); el informe enlaza la ficha de origen. Consulta https://openfoodfacts.github.io/openfoodfacts-server/api/ y https://docs.ollama.com/api/chat.

## Preparar el despliegue en Vercel

1. Sube este proyecto a un repositorio Git e impórtalo en Vercel.
2. Selecciona el preset **Other** y Node.js **24.x**. El archivo `vercel.json` configura `public` como salida estática y ejecuta `npm test` durante la compilación.
3. Las rutas `/api/product` y `/api/health` usan funciones Node.js. La cámara funciona mediante el HTTPS de Vercel.
4. Publica desde Vercel cuando quieras. Esta preparación conserva el proyecto en local y no crea un despliegue.

La consulta de productos funciona sin claves. Para generar resúmenes con IA en Vercel, configura estas variables de entorno en el servidor y vuelve a desplegar.

| Variable | Uso |
| --- | --- |
| `AI_API_KEY` | Clave privada del proveedor |
| `AI_MODEL` | Identificador de un modelo que admita JSON y chat completions |
| `AI_BASE_URL` | URL base HTTPS, por defecto `https://api.groq.com/openai/v1` |

La integración se basa en la [API de Groq](https://console.groq.com/docs/api-reference). El proveedor recibe los datos públicos del producto para redactar el resumen. Los códigos consultados se envían a los catálogos Open Facts. Las fotos se procesan en el navegador y el historial se conserva en el dispositivo. Ollama permite usar IA local durante el desarrollo. En Vercel configura un proveedor HTTPS para el resumen.

Las claves deben agregarse en Vercel, nunca en `public/`. `.gitignore` excluye archivos `.env`. Si la IA tarda o el proveedor falla, la ficha mantiene su información de catálogo y señala que el resumen no está disponible.

Consulta la [documentación de funciones Node.js de Vercel](https://vercel.com/docs/functions/runtimes/node-js). Para revisar el servidor desplegado, abre `/api/health`. El endpoint informa si existe una configuración de IA, sin mostrar su clave.



## IA instalada en este equipo

EcoLupa carga automáticamente la configuración de .env.local al iniciar el servidor local. Se configuró OLLAMA_MODEL=qwen3:4b. Ollama debe estar en ejecución para generar evaluaciones.

El modelo produce una conclusión estructurada, razones y evidencia pendiente. El primer análisis puede tardar hasta tres minutos según el hardware. El código de barras identifica una ficha en los catálogos consultados. La cobertura depende de sus registros y la evidencia disponible.

La IA local analiza los datos suministrados y no navega por internet. El despliegue en Vercel requiere configurar el proveedor remoto indicado arriba. La instalación de Ollama en este equipo no lo hace accesible desde Vercel.

## Proveedor elegido para Vercel

Se preparó Groq con el modelo llama-3.3-70b-versatile. Crea una clave en https://console.groq.com/keys y agrégala como AI_API_KEY en las variables de entorno del proyecto de Vercel. AI_MODEL y AI_BASE_URL son opcionales con este proveedor porque el servidor ya incluye sus valores predeterminados. Después, vuelve a desplegar. Comprueba que /api/health muestra aiMode igual a cloud y realiza una consulta para verificar la respuesta del proveedor. La clave debe permanecer en el servidor.
