# NESDZ — Journal ULM & Annuaire modèles (Astro)

## Démarrer en local
```bash
npm install
npm run dev
```

## Construire
```bash
npm run build
```
Le site statique sort dans `dist/`.

## Déployer sur Hostinger (2 options)
1) **Si Hostinger te propose Astro / Node**
- Connecte le repo Git (GitHub/GitLab) à Hostinger
- Commande build : `npm install && npm run build`
- Dossier de sortie : `dist`

2) **Hébergement “Web” classique (upload de fichiers)**
- En local : `npm install && npm run build`
- Upload le contenu de `dist/` dans `public_html/` via le File Manager Hostinger ou FTP.

## Contenu
- Articles : `src/content/articles/*.md`
- Modèles : `src/content/models/*.md`

## CMS (optionnel)
`/admin/` contient une config Decap CMS (ex-Netlify CMS).  
Le backend par défaut nécessite Git Gateway / Netlify Identity (à adapter selon ton setup).
Tu peux aussi ignorer cette partie et éditer les fichiers Markdown directement.
