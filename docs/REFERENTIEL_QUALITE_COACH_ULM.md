# Référentiel qualité — Coach théorique ULM NESDZ

Version du document : 2.0.0  
Date de revue interne : 6 septembre 2026  
Statut : préparation à un audit, non agréé et non homologué par la DGAC

## 1. Objet et limites

Le Coach théorique ULM NESDZ est un outil indépendant de formation et d’entraînement. Il vise une qualité éditoriale, technique et ergonomique compatible avec une future démarche d’audit. Il ne reproduit pas la banque confidentielle de l’administration et ne délivre aucun titre aéronautique.

Seules la DGAC/DSAC et les entités qu’elle habilite peuvent définir les conditions d’un examen officiel, superviser celui-ci et reconnaître son résultat. La mention « agréé », « homologué » ou toute formule équivalente est interdite dans le produit tant qu’une décision écrite de l’autorité compétente n’a pas été obtenue.

## 2. Référentiel réglementaire suivi

Source primaire : arrêté du 4 mai 2000 relatif aux programmes et au régime des examens du brevet et de la licence de pilote d’aéronef ultraléger motorisé, version consolidée consultée le 6 septembre 2026 :

- [Texte consolidé sur Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000401045/)
- format de référence de l’épreuve commune : 60 questions à choix multiple ;
- durée de référence : 1 heure 30 minutes ;
- seuil de réussite de référence : 75 % ;
- validité du certificat d’aptitude : 24 mois ;
- programme couvert : connaissances aéronef, principes du vol, météorologie, réglementation, performance humaine, navigation, performances et préparation du vol, procédures opérationnelles.

Les paramètres affichés par l’application doivent être revérifiés à chaque évolution réglementaire. La répartition thématique NESDZ sert à garantir une couverture pédagogique équilibrée ; elle ne prétend pas reproduire une pondération officielle ou confidentielle.

## 3. Plan de couverture NESDZ pour une simulation de 60 questions

| Domaine | Questions | Type privilégié |
|---|---:|---|
| Connaissances aéronef | 8 | Banque éditoriale |
| Principes du vol | 8 | Banque éditoriale et calculs vérifiables |
| Météorologie | 8 | Banque éditoriale |
| Réglementation | 8 | Banque éditoriale avec source primaire |
| Navigation | 8 | 4 questions éditoriales et 4 exercices calculés |
| Facteurs humains | 7 | Banque éditoriale |
| Performances et préparation | 7 | 4 questions éditoriales et 3 exercices calculés |
| Procédures opérationnelles | 6 | Banque éditoriale |
| Total | 60 | |

## 4. Standard d’un item

Chaque question publiée doit comporter :

1. un identifiant stable et unique ;
2. un rattachement explicite au domaine du programme ;
3. exactement quatre propositions, distinctes et grammaticalement cohérentes ;
4. une seule réponse défendable dans le contexte énoncé ;
5. une difficulté annoncée ;
6. un indice pédagogique qui ne révèle pas directement la réponse ;
7. une explication de la méthode ou de la notion ;
8. un retour associé à chacune des quatre propositions ;
9. une source traçable, prioritairement réglementaire ou institutionnelle ;
10. une version de banque, une date de revue et un statut éditorial.

Une question réglementaire doit être suspendue dès que sa source primaire est modifiée, jusqu’à nouvelle validation. Une question calculée doit être contrôlée par des tests automatiques et par des cas de référence calculés indépendamment.

## 5. Conventions de calcul

### Vent et piste

- les directions aéronautiques sont exprimées en degrés dans le sens horaire à partir du nord ;
- une direction de vent désigne la provenance du vent ;
- composante de face : `Vvent × cos(angle relatif)` ;
- composante traversière : `Vvent × sin(angle relatif)` ;
- le signe et le côté du vent sont présentés séparément de la valeur absolue.

### Triangle des vitesses

- la route demandée est une route vraie ;
- la vitesse air utilisée est la vitesse air vraie dans l’exercice ;
- le vecteur vent est orienté vers la direction opposée à sa provenance ;
- correction de dérive : `arcsin(|vent traversier| / vitesse air vraie)` ;
- le cap est corrigé vers le côté d’où vient le vent ;
- la vitesse sol résulte de l’addition vectorielle de la vitesse air et du vent.

### Autres calculs

- temps en minutes : `distance NM / vitesse sol kt × 60` ;
- carburant planifié : `consommation L/h × (vol + réserve en minutes) / 60` ;
- distance cartographique : `mesure cm × dénominateur / 100 000` en kilomètres ;
- conversion : `1 NM = 1,852 km` ;
- passage vrai vers magnétique : déclinaison Est retranchée, déclinaison Ouest ajoutée, selon la convention explicitée dans l’énoncé.

Les arrondis doivent toujours être annoncés dans l’énoncé et appliqués seulement au résultat demandé.

## 6. Processus éditorial cible

| Étape | Responsable cible | Preuve conservée |
|---|---|---|
| Rédaction | Auteur identifié | Version initiale et sources |
| Relecture pédagogique | Instructeur ULM qualifié | Nom, date, observations |
| Relecture technique | Second expert indépendant | Validation de la bonne réponse et des distracteurs |
| Relecture réglementaire | Référent réglementation | Version et date des textes |
| Validation numérique | Tests automatiques | Rapport de tests lié au commit |
| Publication | Responsable de version | Journal des modifications |
| Surveillance | Responsable qualité | Date de prochaine revue et signalements |

La mention actuelle « revue interne » signifie que cette double validation nominative n’est pas encore documentée. Elle ne doit pas être assimilée à une validation par un instructeur, la DGAC ou la DSAC.

## 7. Contrôles avant chaque mise en production

- totalité des tests de calcul et d’intégrité de banque réussie ;
- 60 questions uniques dans une simulation et respect du plan de couverture ;
- quatre propositions et quatre retours pour chaque item ;
- aucune source manquante et aucun lien non sécurisé ;
- aucune réponse révélée par l’illustration avant validation de la réponse ;
- correction différée en mode examen ;
- affichage de la réponse choisie, de la réponse attendue, de la méthode et de la source ;
- navigation clavier, libellés accessibles, contraste et affichage mobile contrôlés ;
- minuterie, questions sans réponse et marquage « à revoir » contrôlés ;
- mention « non agréé DGAC » visible ;
- sauvegarde locale testée sans collecte de données personnelles côté serveur.

## 8. Indicateurs qualité à instrumenter

Avant toute démarche officielle, le produit doit pouvoir mesurer de manière anonymisée et consentie :

- taux de réussite par item et par thème ;
- indice de difficulté réel de chaque question ;
- capacité de chaque distracteur à jouer son rôle ;
- corrélation item–score afin de repérer les questions ambiguës ;
- durée médiane de réponse ;
- taux d’abandon et de non-réponse ;
- signalements utilisateurs et délai de traitement ;
- historique des modifications et raisons du changement.

Les données, leur durée de conservation, la base légale, les droits des personnes et les mesures de sécurité devront être documentés conformément au RGPD avant activation d’une télémétrie serveur.

## 9. Conditions restant à satisfaire avant une démarche DGAC/DSAC

La version 2.0.0 améliore fortement la simulation, mais les points suivants restent obligatoires avant de présenter le produit comme candidat sérieux à une reconnaissance :

1. obtenir de la DGAC/DSAC une confirmation écrite de la procédure et du périmètre applicables ;
2. nommer des instructeurs ULM et experts responsables de la validation ;
3. faire relire indépendamment chaque question et conserver la preuve signée ;
4. constituer un corpus beaucoup plus large de questions non calculées ;
5. conduire une étude psychométrique sur un échantillon représentatif ;
6. réaliser un audit d’accessibilité, de sécurité et de protection des données ;
7. formaliser la gestion des incidents, contestations et changements réglementaires ;
8. si un examen officiel est envisagé, documenter identité, surveillance, intégrité, disponibilité, archivage et prévention de la fraude selon les exigences communiquées par l’autorité.

## 10. Décision de publication actuelle

Le Coach peut être publié comme **simulation pédagogique indépendante alignée sur le format réglementaire public**. Il ne peut pas être présenté comme examen officiel, banque DGAC, préparation garantie, centre agréé ou outil homologué.

La prochaine étape qualité recommandée est une revue nominative complète par au moins deux professionnels compétents, suivie d’un échange formel avec la DSAC sur la recevabilité et le processus attendu.
