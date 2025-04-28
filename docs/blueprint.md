# **App Name**: SoilHealth Tracker

## Core Features:

- Soil Data Submission: Formulario Escalonado: Paso 1: Fecha (selección automática) + Ubicación (GPS o manual), Paso 2: Opción A: VESS Score (slider del 1 al 5 con imágenes de referencia), Opción B: Composición del suelo (arena/arcilla/limo en cm → % auto-calculados)
- Data Display: Gráficos Temporales: Línea de tiempo para VESS Score (eje X: fechas, eje Y: 1-5), Linea de tiempo para Texture (eje X: fechas, eje Y: % arena/arcilla/limo), Tabla Resumen: Filtros por fecha/rango y tipo de muestra
- Data Privacy: Selector de visibilidad por muestra: 🔒 Privado (solo el usuario), 🌍 Público (visible para todos)

## Style Guidelines:

- Primario: Verde tierra (#388E3C) → Botones principales y header
- Secundario: Beige (#F5F5DC) → Fondo de formularios
- Acento: Marrón (#795548) → Bordes y elementos interactivos
- Layout: Single-column, priorizando móvil (responsive)
- 📅 Para fechas, 📍 Para ubicación, 📊 Para gráficos
- Tipografía: Roboto (sans-serif legible)

## Original User Request:
Create a simple web application using Firebase that allows users to:

Register and log in using email and password (Firebase Authentication).

Fill out a form to submit soil health data, including:

Soil structure type (dropdown or text field)

VESS (Visual Evaluation of Soil Structure) score (numeric input)

Estimated (cm) of sand and (cm) of clay (numeric inputs) and of silt (cm)

Date (auto-filled with current date)

Optional: location or field name (text field)

Save this data into a Firestore Database under a collection specific to each user.

Allow users to view and edit their own data entries in a simple table.

Enable offline persistence: if the user loses internet connection, their inputs should be saved locally and synchronized with Firestore when the connection is restored.

Include a user setting to define whether their data is "public" or "private" (default: private).

The app should have a clean and simple design suitable for users with limited technical experience, optimized for mobile and desktop.

Important:

No integration with external spreadsheets (Google Sheets).

Use Firestore's built-in offline support.
  