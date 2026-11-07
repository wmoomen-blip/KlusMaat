KLUSMAAT - STARTPAKKET V0.1

INHOUD
- index.html: appscherm
- styles.css: vormgeving
- app.js: berekeningen en lokale opslag
- manifest.webmanifest: PWA-instellingen
- sw.js: offline cache
- icons/: app-iconen

SNEL TESTEN OP EEN COMPUTER
1. Pak klusmaat-startpakket.zip uit.
2. Open de map in Visual Studio Code.
3. Installeer eventueel de extensie 'Live Server'.
4. Klik met rechts op index.html en kies 'Open with Live Server'.

TESTEN OP ANDROID
1. Zet de volledige map online via een HTTPS-hostingdienst.
2. Open de HTTPS-link in Chrome op Android.
3. Kies Chrome-menu (⋮) > 'App installeren' of 'Toevoegen aan startscherm'.
4. De app kan daarna als icoon worden gestart.

BELANGRIJK
- De app gebruikt localStorage: gegevens blijven op hetzelfde apparaat en in dezelfde browser.
- Verwijder browsergegevens niet zonder eerst via Materialen > Export een back-up te maken.
- Dit is een vroege testversie. Geen accounts, cloudsync, betaalfunctie of definitieve zaagoptimalisatie.
- Kastberekeningen zijn indicatief. Controleer constructie, verbindingen, toleranties, sponningen en productiematen vóór het zagen.
- De zaaglijst is een onderdelenoverzicht, geen geoptimaliseerde nesting.
- Voor echte PWA-installatie en offline caching is HTTPS-hosting nodig.


UPDATE V0.2 - PWA INSTALLATIE
- Manifest uitgebreid met app-identiteit en display-instellingen.
- Een apart maskable app-icoon toegevoegd.
- Cacheversie verhoogd zodat de nieuwe bestanden worden opgehaald.
- Na upload kan Chrome enige tijd nodig hebben om de nieuwe installatiegegevens te herkennen.


UPDATE V0.3 - PLAATZAAGPLANNER (TEST)
- Eenvoudige stroken-/rijindeling met zaagbladbreedte.
- Keuze formaatzaag of invalzaag met geleiderail.
- Rotatie alleen beschikbaar bij materiaal zonder nerfrichting.
- Schematische indeling per plaat en CSV-export.
- Geen gegarandeerd optimale nesting; controleer altijd vóór productie.


UPDATE V0.4 - KASTWERKVOORBEREIDING
- Diepte inclusief front optioneel; corpusdiepte wordt berekend.
- Deurmaat met instelbare speling rondom.
- Inliggende achterwand 18 mm met keuze schroeven of deuvels + lijm.
- Ingefreesde achterwand 3/4/6/8/10 mm met instelbare 10 mm opleg en vlakke achterzijde (freesdiepte gelijk aan paneeldikte).
- CSV-export onderdelenlijst.
- Berekeningen zijn voorlopig en moeten vóór productie gecontroleerd worden.


UPDATE - LEGPLANKDIEPTE ACHTERWAND
- Bij een ingefreesde achterwand wordt de legplankdiepte verminderd met de gekozen achterwanddikte/freesdiepte.
- De oplegbreedte (standaard 10 mm) wordt niet meer ten onrechte als dieptecorrectie gebruikt.
- Bij een inliggende achterwand van 18 mm blijft de correctie 18 mm.

UPDATE V0.5 - CACHE VERVERSEN
- Service-worker cacheversie verhoogd zodat de bijgewerkte app.js wordt geladen.
