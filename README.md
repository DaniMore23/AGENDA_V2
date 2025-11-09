# Agenda de Sueño del Bebé

Aplicación web estática para registrar el sueño y las tomas de biberón de un bebé, inspirada en la hoja de seguimiento utilizada en pediatría.

## Características

- Registro diario de intervalos de sueño con visualización en una línea de tiempo de 24 horas (en segmentos de 30 minutos).
- Registro de tomas de biberón con la hora y la cantidad en mililitros.
- Persistencia automática en el navegador mediante `localStorage`.
- Listados diarios editables con opción para eliminar registros.
- Generador de histórico por rango de fechas con gráfica comparativa (horas de sueño vs. mililitros de biberón).

## Uso

1. Instala un servidor estático sencillo (por ejemplo, utilizando Python 3).
2. Desde la raíz del proyecto ejecuta:
   ```bash
   python -m http.server 8000
   ```
3. Abre el navegador en [http://localhost:8000](http://localhost:8000) y selecciona `index.html`.
4. Selecciona el día a registrar, añade los periodos de sueño y las tomas de biberón. Los datos quedan guardados en el navegador.
5. Para visualizar el histórico, indica la fecha inicial y final y pulsa “Generar gráfica”.

> **Nota:** Todos los datos se mantienen únicamente en el dispositivo desde el que se registran.
