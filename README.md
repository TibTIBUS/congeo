# Congéo

Application mobile et ordinateur pour gérer les congés d’une petite équipe de magasin.

## Version 1

- Vue mensuelle et annuelle, dimanches en rouge, récapitulatif imprimable.
- Demandes de jours ou de semaines, avec sélection du nom du salarié.
- Onglet « Demandes de congés » partagé par l’équipe.
- Administration à une adresse séparée, sans lien depuis l’espace salarié.
- Une personne absente à la fois ; la gérante peut autoriser une deuxième personne, jamais une troisième.
- Blocage de la semaine ISO n° 1 et des vacances de Noël, modifiable par la gérante.
- Propositions alternatives avec accord du salarié et annulations soumises à validation.
- Préférence pour les e-mails, envoi uniquement après configuration de l’expéditeur.
- Pas de discussion ni de compteur de solde de congés dans cette V1.

## Architecture

**GitHub Pages héberge l’interface. Neon héberge la base PostgreSQL partagée. Une API serveur relie les deux.**

GitHub Pages ne peut pas exécuter l’API ni héberger la base. Aucun congé ou salarié n’est enregistré dans le dépôt GitHub ou dans le stockage du navigateur. Le navigateur ne conserve que le nom sélectionné sur cet appareil.

Le code `server/` peut être déployé comme Neon Function (Node.js 24), ou sur un hébergeur Node.js compatible avec PostgreSQL. Neon Functions est disponible à Francfort (`aws-eu-central-1`) : l’API et la base de ce projet sont hébergées dans cette région.

Le schéma a été installé sur les branches `dev-congeo-setup` et `production`. L’API `congeo` est déployée sur `production` et son URL publique figure dans `public/config.js`. Les données de démonstration n’ont pas été copiées. GitHub Pages reste à publier.

Projet : `green-union-96090069` ; branche production : `br-fancy-boat-b2szvyhv` ; base : `neondb`.

## Installation et vérifications

Node.js 24 et pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm build:server
```

`dist/` contient l’interface pour Pages, avec `/index.html` et `/admin/index.html`. `dist-server/index.mjs` contient l’API pour Neon Functions.

## Préparer Neon

1. Créer ou sélectionner le projet Neon, puis une branche de développement pour valider le schéma.
2. Obtenir l’URL **directe** pour les migrations et l’URL **poolée** pour l’application. Les conserver dans des variables privées côté serveur ; jamais dans `public/config.js`, une variable `VITE_*` ou le dépôt.
3. Appliquer les migrations versionnées avec Drizzle :

```sh
DATABASE_URL_UNPOOLED="<URL directe privée>" pnpm db:migrate
```

4. Tester la branche de développement avant d’appliquer les mêmes migrations à la branche de production.
5. Déployer l’API, puis configurer son URL publique dans l’interface.

Le serveur serialise les mutations avec un verrou de transaction PostgreSQL. La base contrôle aussi la capacité lors des validations. Cela évite qu’une validation concurrente réserve une troisième place ou qu’une même personne soit validée deux fois sur un jour.

## Déployer le serveur sur Neon Functions

Pour mettre à jour l’API, avec le CLI Neon authentifié :

```sh
pnpm build:server
neon functions deploy congeo --src dist-server/index.mjs --no-bundle --project-id green-union-96090069 --branch br-fancy-boat-b2szvyhv --env ALLOWED_ORIGINS=https://tibtibus.github.io
neon functions get congeo --project-id green-union-96090069 --branch br-fancy-boat-b2szvyhv
```

`DATABASE_URL` est injectée par Neon. Le serveur lit ses secrets depuis l’environnement. Pour un autre hébergeur Node.js, renseigner `DATABASE_URL` et `ALLOWED_ORIGINS` dans cet hébergeur.

Pour les e-mails, ajouter `RESEND_API_KEY` et `EMAIL_FROM` dans les variables privées de déploiement. Sans ces valeurs, les décisions sont sauvegardées et les notifications sont conservées en attente, mais l’interface indique clairement que l’envoi n’est pas activé.

## Préparer GitHub Pages (à faire au moment du déploiement)

1. L’URL de l’API est déjà renseignée dans `public/config.js` (publique, sans clé). Pour la changer, modifier ce fichier ; une variable GitHub Actions `CONGEO_API_URL` peut servir si le fichier laisse l’URL vide.
2. Dans **Settings → Pages → Source**, choisir **GitHub Actions**.
3. Dans **Actions**, lancer manuellement **Publier Congéo sur Pages**.

Le workflow ne se déclenche pas à chaque push : la publication reste manuelle pour cette première mise en service. La base `/congeo/` et le manifeste mobile sont déjà configurés. Si le nom du dépôt ou le domaine change, adapter `VITE_BASE_PATH` et `ALLOWED_ORIGINS`.

L’espace salarié sera à `/congeo/`, l’administration à `/congeo/admin/`. En l’absence d’API configurée, l’application indique que le planning partagé n’est pas connecté et n’autorise pas la saisie de congés.

## Développement local

```sh
pnpm dev
```

Renseigner une URL d’API de développement dans `.env.local` (`VITE_API_URL`) ou `public/config.js`. Pour lancer le serveur localement après compilation :

```sh
pnpm build:server
node --env-file=.env.server server/local.mjs
```

`.env.server` contient `DATABASE_URL`, `ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` et, facultativement, les variables d’envoi d’e-mails.

## Accès sans compte

Conformément au périmètre de la V1, le nom sélectionné n’authentifie pas un salarié et l’administration n’est pas protégée par un compte. CORS limite les origines navigateur autorisées, mais n’est pas une authentification. Les droits devront être protégés côté serveur si des comptes ou un code administrateur sont ajoutés en V2.

## Références

- [GitHub Pages : hébergement statique](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Vite sur GitHub Pages](https://vite.dev/guide/static-deploy.html)
- [Déployer une Neon Function](https://neon.com/docs/compute/functions/deploy)
- [Connexions Neon](https://neon.com/docs/connect/choose-connection)
