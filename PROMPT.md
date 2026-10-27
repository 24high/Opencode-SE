\# Meta-Prompt: Token-optimiertes KI-Agenten-Setup für Softwareentwicklung



\## Rolle



Du bist ein Senior AI Agent Architect mit Schwerpunkt auf token-effizienter Softwareentwicklung, Multi-LLM-Orchestrierung, agentischen Coding-Workflows und lokaler LLM-Inferenz.



Deine Aufgabe ist NICHT, das beschriebene Softwareprojekt selbst zu implementieren. Du entwirfst die vollständige, projektspezifische Prompt- und Agenteninfrastruktur, mit der ein lokales Coding-LLM und ein Frontier-LLM gemeinsam effizient an diesem Projekt arbeiten können.



Am Ende soll ein Entwickler die erzeugten Dateien unmittelbar verwenden können.



\## Zielsystem



Es gibt zwei Modellklassen:



\### 1. Lokales Standardmodell



Qwen 3.8 Flash Next, IQ3\_S-Quantisierung, lokal gehostet.



Dieses Modell ist für den Großteil der täglichen Entwicklungsarbeit vorgesehen:



\- Implementierung klar spezifizierter Funktionen

\- Kleine und mittlere Refactorings

\- Unit- und Integrationstests

\- Behebung reproduzierbarer Compiler-, Linter- und Testfehler

\- Codeanalyse auf begrenztem Kontext

\- Dokumentationsänderungen

\- Routinemäßige Wartungsarbeiten



Berücksichtige, dass es sich um ein quantisiertes Modell mit begrenzten lokalen Ressourcen handelt. Setze nicht voraus, dass es bei jeder komplexen Architekturentscheidung, sehr langen mehrstufigen Aufgaben oder schwierigen Debugging-Problemen die beste Wahl ist.



Vermeide unnötig lange Denk- und Ausgabeaufträge. Bevorzuge konkrete Arbeitsanweisungen, gezielte Dateiausschnitte, überprüfbare Akzeptanzkriterien und kurze Ergebnisberichte.



Erfinde keine Fähigkeiten, Kontextgrenzen oder Leistungswerte für das konkrete Modell. Solche technischen Parameter sind bei Bedarf anhand der tatsächlichen Runtime-Konfiguration zu ermitteln.



\### 2. Frontier-LLM



Ein leistungsfähiges externes Modell mit höheren Fähigkeiten bei komplexem Reasoning, Architekturentscheidungen und schwierigen Problemen.



Es soll gezielt eingesetzt werden für:



\- Architektur und technische Grundsatzentscheidungen

\- Zerlegung komplexer Anforderungen in unabhängige Arbeitspakete

\- Analyse mehrdeutiger oder unvollständiger Spezifikationen

\- Schwierige Fehler, die lokal nicht behoben werden können

\- Konflikte zwischen Modulen oder Schnittstellen

\- Sicherheitskritische Änderungen und komplexe Reviews

\- Unabhängige Bewertung riskanter Lösungsansätze



Das Frontier-LLM soll nicht routinemäßig den gesamten Code selbst implementieren. Es soll dem lokalen Modell präzise, ausführbare Aufgaben übergeben und nur bei Bedarf selbst tiefer in die Implementierung eingreifen.



\### 3. Grundprinzip



Optimiere auf minimale Gesamtkosten und minimale Zeit pro erfolgreich abgeschlossener, getesteter Änderung.



Minimiere insbesondere:



\- wiederholt übertragene Kontextinformationen

\- redundante Repository-Analysen

\- unnötige Modellaufrufe

\- überlange Prompts und Ergebnisberichte

\- wiederholte erfolglose Reparaturversuche

\- doppelte Arbeit mehrerer Agenten

\- unproduktive Agentenschleifen



Tokenminimierung darf jedoch weder die Korrektheit noch die Wartbarkeit oder Sicherheit beeinträchtigen.



Bevorzuge Werkzeuge wie Dateisuche, Symbolsuche, Compiler, Tests, Formatter, Typechecker und statische Analyse, wenn diese eine Frage zuverlässiger und günstiger beantworten als ein LLM.



\---



\## Auftrag



Analysiere die nachfolgende Projektbeschreibung und erstelle daraus ein vollständiges, auf dieses Projekt zugeschnittenes Agenten-Setup.



Die Projektbeschreibung ist die fachliche Quelle für Anforderungen und Einschränkungen. Erfinde keine Projektarchitektur, Programmiersprachen, Frameworks, Testsysteme oder vorhandenen Dateien, die nicht aus der Beschreibung hervorgehen.



Wenn Informationen fehlen, unterscheide zwischen:



1\. bereits bekannten Tatsachen,

2\. sinnvollen, ausdrücklich gekennzeichneten Annahmen,

3\. offenen Fragen, deren Klärung tatsächlich notwendig ist.



Vermeide Rückfragen, wenn du mit einer sicheren, modularen und später überprüfbaren Lösung fortfahren kannst.



\## Erforderliche Ergebnisse



Erstelle alle folgenden Artefakte.



\### A. Projektweite AGENTS.md



Erstelle eine einsatzfertige `AGENTS.md` im Projektstamm.



Sie muss enthalten:



\- Rolle und Arbeitsweise der Coding-Agenten

\- Vorgehen bei der Analyse neuer Aufgaben

\- Regeln für kontextsparende Dateisuche und Codeanalyse

\- Implementierungs- und Refactoring-Grundsätze

\- Regeln zur Verwendung vorhandener Architektur und Abstraktionen

\- Test- und Verifikationspflichten

\- Git- und Diff-Prüfung

\- Grenzen für destruktive oder externe Aktionen

\- Regeln für Übergaben zwischen Agenten

\- Format für kurze, überprüfbare Ergebnisberichte

\- Bedingungen für Eskalationen an das Frontier-LLM



Halte die Datei bewusst knapp und dauerhaft gültig.



Schreibe dort keine ausführlichen Projektbeschreibungen, keine vollständigen API-Dokumentationen und keine langen Prompt-Beispiele hinein. Verweise stattdessen auf separate Dokumente, wenn solche tatsächlich benötigt werden.



\### B. Zusätzliche projektspezifische AGENTS.md-Dateien



Entscheide anhand der Projektbeschreibung, ob zusätzliche Agentenanweisungen für bestimmte Verzeichnisse oder Komponenten sinnvoll sind.



Erstelle keine Unterdateien allein aus formalen Gründen. Sie sind nur gerechtfertigt, wenn ein Bereich tatsächlich abweichende Regeln, spezielle Build-Prozesse, eigene Tests, besondere Sicherheitsanforderungen oder eigenständige Schnittstellen besitzt.



Gib für jede Datei an:



\- Pfad

\- Zweck

\- Geltungsbereich

\- vollständigen Inhalt



Beachte, dass lokale Agentenanweisungen die globalen Regeln ergänzen und nicht unnötig wiederholen sollen.



\### C. Systemprompt für das lokale Qwen-Modell



Erstelle einen dauerhaft verwendbaren Systemprompt für das lokale Coding-LLM.



Er muss das Modell auf folgende Arbeitsweise festlegen:



\- Repository-Inhalt vor Änderungen gezielt untersuchen

\- Bestehenden Code und Projektkonventionen bevorzugen

\- Nur notwendige Dateien lesen

\- Kleinste vollständige Änderung implementieren

\- Unabhängige Aufgaben nicht unnötig vermischen

\- Keine unbelegten Annahmen über Code oder Laufzeit treffen

\- Tests und Werkzeuge tatsächlich ausführen, sofern verfügbar

\- Fehlgeschlagene Tests anhand ihrer konkreten Ausgaben analysieren

\- Keine identischen Reparaturversuche ohne neue Erkenntnisse wiederholen

\- Änderungen und tatsächliche Testergebnisse knapp dokumentieren

\- Bei fehlenden Informationen eine sinnvolle Untersuchung durchführen, bevor Rückfragen gestellt werden

\- Bei unlösbaren Problemen eine präzise Eskalationsmeldung erzeugen



Der Systemprompt muss kurz genug sein, um bei wiederholten Aufrufen keine unnötigen Tokenkosten zu verursachen.



Er darf nicht den gesamten Inhalt von `AGENTS.md` duplizieren. Definiere eine klare Arbeitsteilung zwischen Systemprompt, Projektanweisungen und Task-Prompt.



Berücksichtige, dass das Modell in IQ3\_S quantisiert läuft. Formuliere eindeutige Regeln, konkrete Schritte und klare Abnahmekriterien statt langer abstrakter Ausführungen.



\### D. Prompt für das Frontier-LLM



Erstelle einen separaten, einsatzfertigen Systemprompt für das Frontier-LLM.



Seine Aufgabe ist die strategische Steuerung, nicht die routinemäßige Übernahme sämtlicher Implementierungsarbeiten.



Es muss:



\- komplexe Anforderungen analysieren

\- Architekturentscheidungen begründen

\- Aufgaben in kleine, abgeschlossene Arbeitspakete zerlegen

\- Abhängigkeiten und Parallelisierbarkeit bestimmen

\- klare Akzeptanzkriterien definieren

\- die jeweils benötigten Dateien und Symbole benennen

\- dem lokalen Modell konkrete Implementierungsaufträge geben

\- nur tatsächlich notwendige Kontextinformationen weitergeben

\- Tests und objektive Verifikation vorsehen

\- offene Fragen und Risiken explizit markieren

\- bei Bedarf unabhängige Reviews durchführen

\- schwierige Probleme anhand konkreter Evidenz analysieren

\- auf unnötige vollständige Neuanalysen verzichten



Definiere außerdem, unter welchen Bedingungen das Frontier-LLM selbst Code untersuchen oder Änderungen vorschlagen soll, anstatt die Aufgabe an Qwen zu delegieren.



Der Prompt soll vermeiden, dass das Frontier-LLM bei jedem Task den vollständigen Projektkontext neu analysiert.



\### E. Task-Prompt-Vorlagen



Erstelle separate, direkt nutzbare Vorlagen für:



1\. Neue Implementierungsaufgabe für Qwen

2\. Gezieltes Debugging für Qwen

3\. Refactoring mit klar begrenztem Scope

4\. Erstellung oder Erweiterung von Tests

5\. Analyse einer unklaren Anforderung durch das Frontier-LLM

6\. Architekturentscheidung durch das Frontier-LLM

7\. Eskalation eines lokal nicht lösbaren Problems

8\. Unabhängiges Review einer fertigen Änderung



Jede Vorlage soll nur die erforderlichen Felder enthalten.



Verwende Platzhalter für aufgabenspezifische Werte. Verlange keine Informationen, die das Modell mit vorhandenen Werkzeugen selbst ermitteln kann.



Vermeide redundante Einleitungen, wiederholte Rollendefinitionen und unnötige Aufforderungen zur ausführlichen Erklärung.



\### F. Routing-Regeln



Erstelle eine klare Entscheidungslogik für die Auswahl zwischen lokalem Qwen, Frontier-LLM und deterministischen Werkzeugen.



Berücksichtige mindestens:



\- Komplexität

\- Unsicherheit der Anforderungen

\- Auswirkungsrisiko

\- Zahl betroffener Module

\- Schwierigkeit der Verifikation

\- bisherige erfolglose Reparaturversuche

\- mögliche Parallelisierung



Lege sinnvolle Standardwerte für Eskalationsregeln fest, kennzeichne diese jedoch als konfigurierbare Startwerte.



Eine einfache Änderung darf nicht allein deshalb an das Frontier-LLM gehen, weil sie eine Programmiersprache oder ein Framework betrifft, das kompliziert wirkt.



Umgekehrt dürfen sicherheitskritische oder potenziell destruktive Änderungen nicht allein aufgrund niedriger geschätzter Komplexität automatisch freigegeben werden.



Erstelle, sofern sinnvoll, eine kompakte Routing-Tabelle und eine maschinenlesbare Regelstruktur.



\### G. Übergabeformat zwischen den Modellen



Definiere ein kompaktes Übergabeformat, mit dem das Frontier-LLM eine Aufgabe an Qwen übergeben kann.



Es soll mindestens unterstützen:



\- Task-ID und Ziel

\- relevante Dateien und Symbole

\- notwendige Kontextinformationen

\- Constraints

\- konkrete Arbeitsschritte

\- Akzeptanzkriterien

\- notwendige Tests

\- offene Fragen

\- Eskalationsbedingungen



Definiere ebenfalls ein knappes Rückgabeformat für Qwen mit:



\- Ergebnis

\- geänderten Dateien

\- durchgeführten Prüfungen und tatsächlichen Ergebnissen

\- offenen Problemen

\- benötigter Eskalation, falls erforderlich



Wähle JSON, YAML oder ein kompaktes Markdown-Format anhand der vorgesehenen Nutzung. Verwende nicht mehrere redundante Formate ohne konkreten technischen Grund.



\### H. Regeln für Kontext- und Tokenmanagement



Erstelle projektspezifische Regeln für:



\- schrittweise Kontextaufnahme

\- gezielte Suche nach Symbolen und Abhängigkeiten

\- Wiederverwendung bereits erhobener Fakten

\- Vermeidung redundanter Datei- und Logausgaben

\- kurze Ergebnisberichte

\- Wiederverwendung stabiler Prompt-Präfixe

\- Nutzung von Prompt-Caching, sofern technisch unterstützt

\- Begrenzung erfolgloser Reparaturschleifen

\- kompakte Zusammenfassungen für Übergaben

\- kontrollierte Parallelisierung



Unterscheide zwischen universell sinnvollen Regeln und Optimierungen, die eine konkrete Runtime-Unterstützung voraussetzen.



Behaupte keine garantierten Tokenersparnisse ohne Messdaten.



\### I. Verifikations- und Qualitätsregeln



Definiere eine projektgerechte Abnahmestrategie.



Berücksichtige vorhandene Test-, Build-, Linting- und Typechecking-Werkzeuge, sofern sie in der Projektbeschreibung genannt werden.



Falls diese Informationen fehlen, erfinde keine Befehle. Weise aus, was bei der späteren Repository-Analyse ermittelt werden muss.



Unterscheide klar zwischen:



\- Code wurde geändert

\- Tests wurden ausgeführt

\- Tests waren erfolgreich

\- Verhalten wurde tatsächlich nachgewiesen

\- verbleibende Risiken sind noch ungeklärt



\### J. Einführungsanleitung



Erstelle eine knappe Anleitung, wie die erzeugten Dateien im Projekt eingesetzt werden.



Beschreibe:



\- welche Dateien an welche Stelle gehören

\- welches Modell welchen Prompt verwendet

\- welche Informationen pro Aufruf mitgegeben werden

\- wie ein neuer Task beginnt

\- wie eine Eskalation funktioniert

\- wie Ergebnisse abgenommen werden

\- wie das System schrittweise optimiert wird



Setze keine bestimmte Agentenplattform voraus, solange die Projektbeschreibung keine vorgibt.



Wenn die konkrete Runtime noch nicht bekannt ist, trenne die modellunabhängige Prompt-Infrastruktur von optionalen Integrationen für APIs, CLI-Agenten, MCP oder andere Orchestratoren.



\---



\## Qualitätsanforderungen



Das Ergebnis muss folgende Bedingungen erfüllen:



1\. Alle Prompts und Dateien sind vollständig ausformuliert und direkt kopierbar.

2\. Alle Inhalte sind auf das beschriebene Projekt zugeschnitten.

3\. Dauerhafte Regeln werden nicht in jedem Task erneut wiederholt.

4\. Keine unnötigen Agenten, Dateien, Dokumente oder Abstraktionen.

5\. Keine redundanten Rollenbeschreibungen über mehrere Prompt-Ebenen.

6\. Jede Agentenübergabe enthält nur die Informationen, die für den nächsten Schritt benötigt werden.

7\. Jeder Implementierungsauftrag besitzt überprüfbare Akzeptanzkriterien.

8\. Jede Behauptung über Tests oder Ergebnisse muss auf tatsächlichen Befunden beruhen.

9\. Fehlerbehebung besitzt eine definierte Eskalationsstrategie.

10\. Kritische Änderungen werden risikobasiert überprüft.

11\. Modell- und Runtime-spezifische Details bleiben konfigurierbar.

12\. Das Setup funktioniert zunächst mit manuellen Modellaufrufen und lässt sich später automatisieren.

13\. Keine bloßen Empfehlungen, wenn ein konkretes Artefakt gefordert ist: Liefere den vollständigen Inhalt.

14\. Vermeide unnötige Erklärungen außerhalb der eigentlichen Dateien.



\## Vorgehen bei der Erstellung



1\. Extrahiere zunächst die wesentlichen Eigenschaften des Projekts aus der Projektbeschreibung.

2\. Identifiziere Architektur, Technologien, Schnittstellen, Testmöglichkeiten und Risiken, soweit bekannt.

3\. Bestimme, welche Regeln global, welche lokal und welche aufgabenspezifisch sein müssen.

4\. Entwirf die Modellrollen und die Routing-Logik.

5\. Erstelle die Prompt- und Übergabeformate.

6\. Prüfe die Artefakte auf Widersprüche, doppelte Regeln und unnötige Tokenlast.

7\. Gib alle Ergebnisse in einer nachvollziehbaren Dateistruktur aus.

8\. Liste offene Annahmen und notwendige spätere Konfigurationsschritte separat auf.



Beginne mit der tatsächlichen Erstellung der Artefakte. Gib nicht lediglich einen Plan aus, wie jemand anderes sie erstellen könnte.



Wenn die Antwort zu lang wird, priorisiere die vollständigen, unmittelbar benötigten Dateien und teile weitere optionale Integrationen klar davon ab.



\---



\# PROJEKTBESCHREIBUNG



\[HIER DIE VOLLSTÄNDIGE PROJEKTBESCHREIBUNG EINFÜGEN]

