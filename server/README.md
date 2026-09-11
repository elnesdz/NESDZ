# Socle PHP/MySQL NESDZ sur Hostinger

Ce dossier contient les éléments privés d'installation. Les scripts exécutés
par Hostinger sont dans `public/api` afin qu'Astro les copie dans `dist/api`.

## Installation initiale

1. Dans phpMyAdmin, sélectionner la base NESDZ créée dans hPanel.
2. Importer `server/database/schema.sql` une seule fois.
3. Dans le gestionnaire de fichiers Hostinger, remonter d'un niveau depuis
   `public_html` et créer `nesdz-private`.
4. Copier `server/config/config.example.php` vers
   `nesdz-private/config.php`.
5. Remplacer uniquement les valeurs `PREFIXE_...` et `REMPLACER_...` avec les
   valeurs conservées dans le gestionnaire de mots de passe.
6. Vérifier que les permissions de `config.php` ne donnent pas d'écriture aux
   autres utilisateurs du serveur (idéalement `600`, sinon le réglage le plus
   restrictif accepté par Hostinger).
7. Déployer le contenu de `dist` dans `public_html` sans supprimer
   `public_html/docs`.
8. Ouvrir `https://nesdz.com/api/v1/health.php`.

Réponse attendue après configuration :

```json
{"ok":true,"service":"nesdz-api","status":"ready","database":"ready"}
```

Avant configuration, l'endpoint répond volontairement en `503` sans afficher
le chemin, le nom, l'utilisateur ou le mot de passe MySQL.

## Principes de sécurité

- aucun secret n'est commité dans GitHub ou inclus dans `dist` ;
- les mots de passe seront stockés avec `password_hash`, jamais en clair ;
- les jetons d'activation et de session seront stockés sous forme de SHA-256 ;
- l'accès annuel sera représenté par une habilitation datée, pas par un lien
  secret valable 365 jours ;
- les événements Stripe seront rendus idempotents par leur identifiant unique ;
- les e-mails seront placés dans une file avant envoi par SMTP et tâche cron ;
- les adresses IP seront seulement un signal de risque, jamais un verrou strict.

## Éléments volontairement non activés dans ce lot

- création de compte et connexion ;
- webhook Stripe et encaissement réel ;
- envoi SMTP ;
- migration du moteur de questions côté serveur.

Ils seront ajoutés par petits lots testables après validation du socle.
