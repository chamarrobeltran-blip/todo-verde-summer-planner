# Todo Verde Summer Planner

App de inscripción a una colonia de verano (verano 2027) con dos sedes y turnos, para que las familias elijan turno y quincenas, vean su sede y extras, y calculen el precio de la temporada.

PANTALLAS
- Inicio: nombre «Colonia Todo Verde», explicación corta en voseo rioplatense, botón «Empezar inscripción».
- Datos del niño/a: campos «Nombre y apellido», «Fecha de nacimiento», «Nombre del adulto responsable», «Teléfono», «Email». Calcula grupo por edad cumplida el 4/1/2027; con menos de 3 o más de 13 avisa «No entra en ninguno de nuestros grupos» y no deja seguir.
- Elegir turno: «Turno mañana — Sede Barda, 9:00 a 13:00» o «Turno tarde — Sede Confluencia, 13:30 a 17:30». Sede y horario siempre visibles. Cambiar turno borra extras incompatibles con aviso.
- Quincenas y extras: 4 quincenas con fecha, temática, cuota $290.000 y lugares libres; «Sin lugar» si cupo 0. Extras según turno con su cupo. Frase «Con las cuatro quincenas ahorrás $160.000».
- Resumen y confirmación: total, aviso al bajar una de cuatro, botón «Confirmar inscripción», descarga de archivo .ics con fechas 2027.

DATOS
- Sede: nombre, turno, horario_inicio, horario_fin.
- Grupo: nombre, edad_min, edad_max, cupo_barda (int), cupo_confluencia (int).
- Quincena: numero, fecha_inicio (2027), fecha_fin (2027), tematica, cuota (290000).
- Extra: nombre, turno, precio, cupo, grupos_excluidos.
- Inscripcion: niño, adulto, teléfono, email, sede, grupo, quincenas[], extras[], total.
- CupoOcupado: quincena, grupo, sede, inscriptos (cuenta independiente por quincena).
Precargar sedes, 4 grupos (Chispas/Brotes/Ramas/Copas), 4 quincenas y 3 extras con los valores indicados.

DISEÑO
Paleta patagónica de álamos y río: verde oliva base, acento naranja, un color distinto por sede. Familiar y cálido, voseo, frases cortas.

CRITERIOS DE ACEPTACIÓN
- El grupo se fija con la edad al 4/1/2027 y no cambia en toda la temporada.
- Libres = cupo de la sede − inscriptos en esa quincena y grupo; mañana y tarde no comparten cupo.
- Una inscripción de varias quincenas resta un lugar en cada una; una sin lugar muestra «Sin lugar» y no bloquea las demás.
- Extra en cupo 0 se muestra gris solo en esa quincena.
- Dar de baja una quincena devuelve su lugar y extras.
- Total: 1 a 3 quincenas = cuota × quincenas + extras; 4 quincenas = $1.000.000 + extras; al bajar una de cuatro avisa antes de confirmar.
- Cambiar turno elimina extras incompatibles con aviso.
- Interfaz optimizada y responsive para móvil y web.

STACK
TanStack Start + Supabase.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://todo-verde-summer-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/78a52d28-ce23-45b2-905f-7edfa96fef46).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
