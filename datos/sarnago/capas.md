# Capas de los planos DXF de Sarnago

Seis planos del TFG «Sarnago: radiografía dinámica de lugares sociales» (Universidad de Zaragoza, 2019).
Se han exportado del DWG original (`TFG_recover_recover_recover.dwg`) con AutoCAD 2022 Core Console y se han limpiado con `ezdxf`.
Cada plano corresponde a una ventana de la presentación «Presentación2», la que se usó para imprimir las láminas A3 del TFG.

## Criterios generales

- **Formato:** DXF 2018 (AC1032). Unidades en metros (`$INSUNITS = 6`).
- **Coordenadas:** son locales del dibujo original, sin georreferenciar. Los seis planos comparten escala, pero cada uno está desplazado a su propia posición dentro del modelo.
- **Capas:** se conservan el nombre y el color de cada capa del original. Todas quedan encendidas y descongeladas.
- **Elementos fuera de ventana:** las entidades que cruzan el borde de la ventana se conservan enteras, sin recortar.
- **Eliminado de todos los planos:**
  - Las ortofotos enlazadas (IMAGE). Contenían rutas locales y no viajan con el DXF.
  - Los bloques auxiliares de capas apagadas.
  - Las capas que estaban apagadas en el original (`S_Majada`, `S_VivSombre`, `_Aux`).
- **Datos personales eliminados:**
  - Números de portal.
  - Rótulos con nombres, apodos y direcciones.
  - En los planos de relaciones sociales, las líneas que unían cada vivienda con la localidad donde vive la familia. Las cifras agregadas por ciudad están en `resumen.md`.
  - Solo quedan las iniciales de los nombres de pila, sin apellidos.
- **Colores:** la columna «Color» da el índice de color de AutoCAD (ACI) y su equivalente RGB. Las entidades con color propio (no PorCapa) lo conservan.

## TFG_nucleo_1955_usos.dxf

**Núcleo de Sarnago 1955: usos de cada edificio y estado de las viviendas.** Figura 46, escala 1:1.000 del TFG. Ventana del modelo original: X 6222–6537, Y 322–579. 872 entidades, 2.78 MB.

Eliminado en este plano: Foto1956 (IMAGE): 1, S_Textos (texto): 121.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Arboles` | 51 | #FFFF7F | 80 | HATCH 80 | Árboles (manchas de copa sombreadas). |
| `_Caminos` | 2 | #FFFF00 | 35 | SPLINE 35 | Bordes de calles y caminos. |
| `_Contorno` | 70 | #7FFF00 | 159 | LWPOLYLINE 159 | Contorno cerrado de las edificaciones. |
| `_Proyeccion1` | 3 | #00FF00 | 163 | LWPOLYLINE 163 | Trazas de los muros de edificios y ruinas. |
| `_Tejados` | 2 | #FFFF00 | 190 | LWPOLYLINE 190 | Tejados: líneas y sombreados de cubierta. |
| `_Tierras` | 51 | #FFFF7F | 69 | SPLINE 42, LWPOLYLINE 27 | Lindes de fincas, bancales y parcelario agrario. |
| `_Vegetacion` | 51 | #FFFF7F | 11 | HATCH 11 | Vegetación y arbolado (manchas sombreadas). |
| `_VG` | 6 | #FF00FF | 1 | LWPOLYLINE 1 | Marco de encuadre del plano. |
| `NU_Corrales` | 121 | #7FFFDF | 21 | LWPOLYLINE 16, HATCH 5 | Edificio privado: Corral. |
| `NU_HornoPrivado` | 231 | #FF7FBF | 3 | HATCH 3 | Edificio privado: Horno privado. |
| `NU_Lugares de reunión` | 191 | #BF7FFF | 9 | LWPOLYLINE 5, HATCH 4 | Espacios públicos / lugares de reunión. |
| `NU_Majadas` | 61 | #DFFF7F | 28 | HATCH 28 | Edificio privado: Majada. |
| `NU_Pajares` | 33 | #A57C52 | 6 | HATCH 6 | Edificio privado: Pajar. |
| `NU_PavEmpedrado` | 252 | #666666 | 1 | HATCH 1 | Pavimento: empedrado. |
| `NU_PavTierra` | 252 | #666666 | 46 | HATCH 24, LWPOLYLINE 22 | Pavimento: tierra. |
| `NU_Público` | 134 | #007F7F | 7 | HATCH 7 | Edificios públicos (sombreado general). |
| `NU_Texto` | 2 | #FFFF00 | 7 | MTEXT 7 | Números 1-6 de los edificios públicos, como en la leyenda del plano: 1 Ayuntamiento, 2 Cantina, 3 Cementerio, 4 Fragua, 5 Iglesia, 6 Lavadero. |
| `NU_VivDesha` | 123 | #52A591 | 1 | HATCH 1 | Vivienda deshabitada. |
| `NU_VivPerm` | 64 | #5F7F00 | 19 | HATCH 17, LWPOLYLINE 2 | Vivienda habitada (vivienda permanente). |
| `S_Textos` | 2 | #FFFF00 | 16 | MTEXT 16 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |

## TFG_nucleo_2019_usos.dxf

**Núcleo de Sarnago 2019: usos de cada edificio y estado de las viviendas (estado a 30/06/2019).** Figura 47, escala 1:1.000 del TFG. Ventana del modelo original: X 6913–7228, Y 321–578. 1665 entidades, 8.49 MB.

Eliminado en este plano: Foto2017 (IMAGE): 1, S_Textos (texto): 121.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Arboles` | 51 | #FFFF7F | 201 | HATCH 201 | Árboles (manchas de copa sombreadas). |
| `_Caminos` | 2 | #FFFF00 | 39 | SPLINE 34, LWPOLYLINE 5 | Bordes de calles y caminos. |
| `_Contorno` | 70 | #7FFF00 | 77 | LWPOLYLINE 75, SPLINE 2 | Contorno cerrado de las edificaciones. |
| `_Proyeccion1` | 3 | #00FF00 | 456 | LWPOLYLINE 455, SPLINE 1 | Trazas de los muros de edificios y ruinas. |
| `_Tierras` | 51 | #FFFF7F | 116 | LWPOLYLINE 61, SPLINE 44, LINE 11 | Lindes de fincas, bancales y parcelario agrario. |
| `_Vegetacion` | 51 | #FFFF7F | 193 | HATCH 193 | Vegetación y arbolado (manchas sombreadas). |
| `_VG` | 6 | #FF00FF | 1 | LWPOLYLINE 1 | Marco de encuadre del plano. |
| `NU_Almacen_Garaje` | 20 | #FF3F00 | 8 | HATCH 7, LWPOLYLINE 1 | Edificio privado: Almacén. |
| `NU_Lugares de reunión` | 191 | #BF7FFF | 6 | HATCH 3, LWPOLYLINE 3 | Espacios públicos / lugares de reunión. |
| `NU_PavAsfalto` | 252 | #666666 | 2 | LWPOLYLINE 1, HATCH 1 | Pavimento: asfalto. |
| `NU_PavHormigon` | 252 | #666666 | 29 | LWPOLYLINE 18, HATCH 11 | Pavimento: hormigón. |
| `NU_PavTierra` | 252 | #666666 | 31 | HATCH 30, LWPOLYLINE 1 | Pavimento: tierra. |
| `NU_Público` | 134 | #007F7F | 3 | HATCH 3 | Edificios públicos (sombreado general). |
| `NU_SolarLinea` | 152 | #0052A5 | 409 | LWPOLYLINE 408, SPLINE 1 | Perímetro de solares y ruinas. |
| `NU_SolarRuina` | 169 | #131758 | 59 | HATCH 56, LWPOLYLINE 2, SPLINE 1 | Solar / ruina (sombreado). |
| `NU_Texto` | 2 | #FFFF00 | 4 | MTEXT 4 | Números 1-6 de los edificios públicos, como en la leyenda del plano: 1 Ayuntamiento, 2 Cantina, 3 Cementerio, 4 Fragua, 5 Iglesia, 6 Lavadero. |
| `NU_VivDesha` | 123 | #52A591 | 3 | HATCH 3 | Vivienda deshabitada. |
| `NU_VivGeneral` | 102 | #00A529 | 9 | HATCH 9 | Vivienda. |
| `proyec 2` | 3 | #00FF00 | 3 | LWPOLYLINE 3 | Líneas auxiliares de dibujo (sin entrada en la leyenda). |
| `S_Textos` | 2 | #FFFF00 | 16 | MTEXT 16 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |

## TFG_entorno_1955.dxf

**Entorno de Sarnago 1955: caminos, eras, campos y comunales.** Figura 28, escala 1:1.500 del TFG. Ventana del modelo original: X 6049–6522, Y 959–1345. 992 entidades, 3.32 MB.

Eliminado en este plano: Foto1956 (IMAGE): 1.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Arboles` | 51 | #FFFF7F | 123 | HATCH 123 | Árboles (manchas de copa sombreadas). |
| `_Caminos` | 2 | #FFFF00 | 33 | SPLINE 30, LWPOLYLINE 2, HATCH 1 | Bordes de calles y caminos. |
| `_Contorno` | 70 | #7FFF00 | 160 | LWPOLYLINE 160 | Contorno cerrado de las edificaciones. |
| `_Proyeccion1` | 3 | #00FF00 | 162 | LWPOLYLINE 162 | Trazas de los muros de edificios y ruinas. |
| `_Tejados` | 2 | #FFFF00 | 380 | LWPOLYLINE 283, HATCH 97 | Tejados: líneas y sombreados de cubierta. |
| `_Tierras` | 51 | #FFFF7F | 106 | SPLINE 77, LWPOLYLINE 29 | Lindes de fincas, bancales y parcelario agrario. |
| `_VG` | 6 | #FF00FF | 1 | LWPOLYLINE 1 | Marco de encuadre del plano. |
| `_VG2` | 3 | #00FF00 | 1 | LWPOLYLINE 1 | Marco auxiliar de encuadre. |
| `EP_CamposDeCultivo` | 32 | #A55200 | 8 | HATCH 8 | Tierras en activo: campos de cultivo. |
| `EP_ComunalPasto` | 132 | #00A5A5 | 2 | HATCH 2 | Tierras en activo: comunales (para pasto). |
| `EP_Eras` | 90 | #00FF00 | 5 | HATCH 5 | Tierras en activo: eras. |
| `EP_Herrañes` | 50 | #FFFF00 | 6 | HATCH 6 | Tierras en activo: herrañes (término de la leyenda del plano). |
| `S_Textos` | 2 | #FFFF00 | 5 | MTEXT 5 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |

## TFG_entorno_2019.dxf

**Entorno de Sarnago 2019: caminos, eras, campos y tierras en desuso.** Figura 29, escala 1:1.500 del TFG. Ventana del modelo original: X 6800–7273, Y 959–1345. 1326 entidades, 7.99 MB.

Eliminado en este plano: Foto2017 (IMAGE): 1, _Aux (INSERT): 1.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Arboles` | 51 | #FFFF7F | 365 | HATCH 365 | Árboles (manchas de copa sombreadas). |
| `_Caminos` | 2 | #FFFF00 | 42 | SPLINE 37, LWPOLYLINE 5 | Bordes de calles y caminos. |
| `_Contorno` | 70 | #7FFF00 | 79 | LWPOLYLINE 77, SPLINE 2 | Contorno cerrado de las edificaciones. |
| `_Proyeccion1` | 3 | #00FF00 | 458 | LWPOLYLINE 457, SPLINE 1 | Trazas de los muros de edificios y ruinas. |
| `_Tejados` | 2 | #FFFF00 | 216 | LWPOLYLINE 119, HATCH 97 | Tejados: líneas y sombreados de cubierta. |
| `_Tierras` | 51 | #FFFF7F | 134 | LWPOLYLINE 64, SPLINE 59, LINE 11 | Lindes de fincas, bancales y parcelario agrario. |
| `_VG` | 6 | #FF00FF | 1 | LWPOLYLINE 1 | Marco de encuadre del plano. |
| `EP_CamposDeCultivo` | 32 | #A55200 | 4 | HATCH 4 | Tierras en activo: campos de cultivo. |
| `EP_ComunalPasto` | 132 | #00A5A5 | 3 | HATCH 3 | Tierras en activo: comunales (para pasto). |
| `EP_ErasIN` | 91 | #7FFF7F | 17 | HATCH 13, LWPOLYLINE 4 | Tierras en desuso: eras abandonadas (sufijo IN = inactivo). |
| `proyec 2` | 3 | #00FF00 | 3 | LWPOLYLINE 3 | Líneas auxiliares de dibujo (sin entrada en la leyenda). |
| `S_Textos` | 2 | #FFFF00 | 4 | MTEXT 4 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |

## TFG_relaciones_sociales_1955.dxf

**Relaciones sociales 1955 (anonimizado).** Figura 58, escala 1:1.000 del TFG. Ventana del modelo original: X 6167–6482, Y -693–-436. 1039 entidades, 0.54 MB.

Eliminado en este plano: S_Majada (HATCH): 35, S_Textos (texto): 128, S_VivSombre (HATCH): 1.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Caminos` | 2 | #FFFF00 | 32 | SPLINE 30, LWPOLYLINE 2 | Bordes de calles y caminos. |
| `_Proyeccion1` | 3 | #00FF00 | 162 | LWPOLYLINE 162 | Trazas de los muros de edificios y ruinas. |
| `_Tierras` | 51 | #FFFF7F | 69 | SPLINE 42, LWPOLYLINE 27 | Lindes de fincas, bancales y parcelario agrario. |
| `S_Cabezas familia` | 3 | #00FF00 | 198 | CIRCLE 198 | Símbolo de cada persona de la familia: cabezas de familia y descendientes. |
| `S_Circulo grande` | 191 | #BF7FFF | 52 | CIRCLE 52 | Círculo de la familia que reside en cada vivienda. |
| `S_ContornoViv` | 2 | #FFFF00 | 215 | LWPOLYLINE 215 | Contorno de las viviendas: base del plano de relaciones. |
| `S_Iniciales` | 3 | #00FF00 | 198 | MTEXT 198 | Inicial del nombre de pila de cada persona, dentro de su símbolo. No hay apellidos. |
| `S_Lineas hermanos` | 72 | #52A500 | 8 | ARC 8 | Lazos de hermandad entre viviendas del pueblo. |
| `S_Lineas hijos` | 71 | #BFFF7F | 36 | ARC 36 | Lazos familia-descendientes entre viviendas del pueblo. Se han quitado los que iban a otras localidades. |
| `S_Sombreado` | 191 | #BF7FFF | 52 | HATCH 52 | Relleno de los círculos de familia. |
| `S_Textos` | 2 | #FFFF00 | 17 | MTEXT 17 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |

## TFG_relaciones_sociales_2019.dxf

**Relaciones sociales 2019 (anonimizado).** Figura 59, escala 1:1.000 del TFG. Ventana del modelo original: X 6949–7264, Y -884–-627. 741 entidades, 0.38 MB.

Eliminado en este plano: S1_Lineas (enlace_a_fuera): 23, S_Textos (texto): 121.

| Capa | Color ACI | RGB | Entidades | Tipos | Qué es |
|---|---|---|---|---|---|
| `_Caminos` | 2 | #FFFF00 | 39 | SPLINE 34, LWPOLYLINE 5 | Bordes de calles y caminos. |
| `_Contorno` | 70 | #7FFF00 | 77 | LWPOLYLINE 75, SPLINE 2 | Contorno cerrado de las edificaciones. |
| `_Proyeccion1` | 3 | #00FF00 | 456 | LWPOLYLINE 455, SPLINE 1 | Trazas de los muros de edificios y ruinas. |
| `_Tierras` | 51 | #FFFF7F | 116 | LWPOLYLINE 61, SPLINE 44, LINE 11 | Lindes de fincas, bancales y parcelario agrario. |
| `_VG` | 6 | #FF00FF | 1 | LWPOLYLINE 1 | Marco de encuadre del plano. |
| `Mapa_CirculoGurdu` | 192 | #5200A5 | 21 | HATCH 21 | Ocupación de la vivienda según el grado de afinidad de sus habitantes con el pueblo (grados 4 y 5). |
| `NU_PavAsfalto` | 252 | #666666 | 1 | LWPOLYLINE 1 | Pavimento: asfalto. |
| `NU_VivGeneral` | 102 | #00A529 | 9 | HATCH 9 | Vivienda. |
| `proyec 2` | 3 | #00FF00 | 3 | LWPOLYLINE 3 | Líneas auxiliares de dibujo (sin entrada en la leyenda). |
| `S1_Lineas` | 71 | #BFFF7F | 2 | ARC 2 | Relaciones familiares de primer grado dentro del pueblo. Se han quitado las 23 líneas vivienda → ciudad de residencia. |
| `S_Textos` | 2 | #FFFF00 | 16 | MTEXT 16 | Rótulos de calles y caminos. Se han borrado los números de portal y cualquier rótulo con nombres o direcciones. |
