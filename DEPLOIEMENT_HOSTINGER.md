# Déployer NESDZ sur Hostinger

Le site n’est pas publié automatiquement chez Hostinger. GitHub prépare le
paquet de production ; il faut ensuite copier son contenu dans `public_html`.

## 1. Télécharger le bon paquet

1. Ouvrir l’onglet **Actions** du dépôt GitHub.
2. Ouvrir le workflow **Build Astro (dist)**.
3. Choisir l’exécution verte la plus récente sur la branche `main`.
4. Dans **Artifacts**, télécharger **dist**.
5. Décompresser le fichier ZIP sur l’ordinateur.

## 2. Sauvegarder la version en ligne

Avant tout remplacement, créer une archive ou télécharger une copie du dossier
`public_html`. Cette sauvegarde permet un retour immédiat à la version précédente.

## 3. Envoyer les fichiers

1. Ouvrir le gestionnaire de fichiers Hostinger.
2. Entrer dans `public_html`.
3. Remplacer les anciens fichiers par **le contenu** du ZIP `dist`.
4. Vérifier que `index.html`, `_astro`, `data`, `outils` et `.htaccess` sont
   directement dans `public_html` — pas dans un sous-dossier `dist`.
5. Conserver les fichiers propres à Hostinger qui ne font pas partie du site,
   sauf si leur remplacement est volontaire.

Le fichier `.htaccess` est caché par son nom, mais le gestionnaire Hostinger
affiche normalement les fichiers cachés. Il contient les en-têtes de sécurité,
les règles de cache, la compression et la page d’erreur 404 de NESDZ.

## 4. Vider les caches

Après l’envoi, vider le cache Hostinger/CDN s’il est activé, puis faire un
rechargement forcé du navigateur.

## 5. Vérifications rapides

- ouvrir la page d’accueil ;
- ouvrir `/outils/` et vérifier qu’aucun terrain n’est présélectionné ;
- charger un terrain connu, par exemple LFQQ ;
- vérifier METAR, TAF, NOTAM, radio et liens SOFIA/VAC ;
- tester sur téléphone ;
- ouvrir une adresse inexistante et vérifier la page 404.

En cas de problème, restaurer la sauvegarde de `public_html` et conserver le ZIP
défectueux pour permettre l’analyse.
