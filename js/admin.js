
/* =========================================
   MBANG / JOSEPH MBANG - ADMINISTRATION
   Connexion, publications, photos et vidéos
========================================= */

const loginForm = document.getElementById("login-form");
const loginSection = document.getElementById("login-section");
const loginMessage = document.getElementById("login-message");

const publicationSection =
    document.getElementById("publication-section");

const myPublications =
    document.getElementById("my-publications");

const publicationForm =
    document.getElementById("publication-form");

const logoutButton =
    document.getElementById("logout-button");


// =========================================
// 1. AFFICHER LES SECTIONS
// =========================================

function afficherEtatConnecte(connecte) {
    loginSection.hidden = connecte;
    publicationSection.hidden = !connecte;
    myPublications.hidden = !connecte;
}

function afficherMessage(message, erreur = false) {
    loginMessage.textContent = message;
    loginMessage.style.color = erreur ? "#dc2626" : "#15803d";
}


// =========================================
// 2. CHARGER LES PUBLICATIONS
// =========================================

async function chargerPublications() {
    myPublications.innerHTML = "<h2>Mes publications</h2>";

    const { data, error } = await supabaseClient
        .from("publications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        myPublications.innerHTML +=
            "<p>Impossible de charger les publications.</p>";

        console.error("Erreur de chargement :", error);
        return;
    }

    if (!data || data.length === 0) {
        myPublications.innerHTML +=
            "<p>Aucune publication pour le moment.</p>";
        return;
    }

    data.forEach(function (publication) {
        const article = document.createElement("article");

        article.style.padding = "18px 0";
        article.style.borderBottom = "1px solid #e2e8f0";

        const titre = document.createElement("h3");
        titre.textContent = publication.titre;

        const categorie = document.createElement("p");
        categorie.textContent = "Catégorie : " + publication.categorie;

        const contenu = document.createElement("p");
        contenu.textContent = publication.contenu;

        article.append(titre, categorie, contenu);

        // Afficher la photo ou la vidéo enregistrée
        if (publication.photo_url) {
            const url = publication.photo_url;

            const extensionVideo =
                /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);

            const media = document.createElement(
                extensionVideo ? "video" : "img"
            );

            media.src = url;
            media.style.display = "block";
            media.style.width = "100%";
            media.style.maxHeight = "400px";
            media.style.objectFit = "contain";
            media.style.marginTop = "12px";
            media.style.borderRadius = "8px";

            if (extensionVideo) {
                media.controls = true;
                media.preload = "metadata";
                media.playsInline = true;
            } else {
                media.alt = publication.titre;
                media.loading = "lazy";
            }

            article.appendChild(media);
        }

        myPublications.appendChild(article);
    });
}


// =========================================
// 3. VÉRIFIER LA SESSION ADMINISTRATEUR
// =========================================

async function verifierConnexion() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data.session;

        afficherEtatConnecte(Boolean(session));

        if (session) {
            await chargerPublications();
        }
    } catch (erreur) {
        afficherEtatConnecte(false);

        afficherMessage(
            "Impossible de vérifier la connexion.",
            true
        );

        console.error("Erreur de session :", erreur);
    }
}


// =========================================
// 4. CONNECTER L'ADMINISTRATEUR
// =========================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const bouton =
        loginForm.querySelector('button[type="submit"]');

    bouton.disabled = true;
    bouton.textContent = "Connexion en cours...";

    afficherMessage("Tentative de connexion...");

    try {
        const email =
            document.getElementById("admin-email").value.trim();

        const password =
            document.getElementById("admin-password").value;

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            afficherMessage(
                "Connexion refusée. Vérifie ton e-mail et ton mot de passe.",
                true
            );

            console.error("Erreur de connexion :", error);
            return;
        }

        afficherEtatConnecte(true);
        afficherMessage("Connexion réussie !");

        await chargerPublications();

    } catch (erreur) {
        afficherMessage(
            "Une erreur empêche la connexion. Vérifie Internet et Supabase.",
            true
        );

        console.error("Erreur inattendue :", erreur);

    } finally {
        bouton.disabled = false;
        bouton.textContent = "Se connecter";
    }
});


// =========================================
// 5. PUBLIER UN TEXTE, UNE PHOTO OU UNE VIDÉO
// =========================================

publicationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const bouton =
        publicationForm.querySelector('button[type="submit"]');

    bouton.disabled = true;
    bouton.textContent = "Publication en cours...";

    let fichierEnvoye = null;
    let cheminFichier = null;

    try {
        // Vérifier la connexion
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const utilisateur = sessionData.session?.user;

        if (!utilisateur) {
            afficherEtatConnecte(false);
            afficherMessage("Connecte-toi avant de publier.", true);
            return;
        }

        // Lire les champs du formulaire
        const titre =
            document.getElementById("titre").value.trim();

        const categorie =
            document.getElementById("categorie").value;

        const contenu =
            document.getElementById("contenu").value.trim();

        const champMedia = document.getElementById("media");

        const fichier = champMedia.files[0];

        if (!titre || !categorie || !contenu) {
            alert("Remplis le titre, la catégorie et le contenu.");
            return;
        }

        // Vérifier le type de fichier
        if (fichier) {
            const typeValide =
                fichier.type.startsWith("image/") ||
                fichier.type.startsWith("video/");

            if (!typeValide) {
                alert("Choisis une photo ou une vidéo valide.");
                return;
            }

            // Limite de sécurité : 50 Mo par fichier
            if (fichier.size > 50 * 1024 * 1024) {
                alert(
                    "Le fichier dépasse 50 Mo. Choisis un fichier plus léger."
                );
                return;
            }
        }

        let mediaUrl = null;

        // Envoyer le fichier vers Supabase Storage
        if (fichier) {
            const nomNettoye = fichier.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

            cheminFichier =
                utilisateur.id + "/" +
                Date.now() + "_" + nomNettoye;

            const { error: uploadError } =
                await supabaseClient.storage
                    .from("photos-publications")
                    .upload(cheminFichier, fichier, {
                        upsert: false,
                        contentType: fichier.type
                    });

            if (uploadError) {
                throw uploadError;
            }

            fichierEnvoye = true;

            const { data: urlData } =
                supabaseClient.storage
                    .from("photos-publications")
                    .getPublicUrl(cheminFichier);

            mediaUrl = urlData.publicUrl;
        }

        // Enregistrer la publication dans la base de données
        const { error: insertError } =
            await supabaseClient
                .from("publications")
                .insert({
                    titre: titre,
                    categorie: categorie,
                    contenu: contenu,
                    photo_url: mediaUrl,
                    user_id: utilisateur.id
                });

        if (insertError) {
            throw insertError;
        }

        publicationForm.reset();

        alert("Publication enregistrée !");

        await chargerPublications();

    } catch (erreur) {
        console.error("Erreur de publication :", erreur);

        if (fichierEnvoye && cheminFichier) {
            console.error(
                "Le fichier a été envoyé, mais la publication a échoué. " +
                "Le fichier peut encore être présent dans Storage :",
                cheminFichier
            );
        }

        alert(
            "La publication a échoué. Vérifie la console pour connaître l'erreur."
        );

    } finally {
        bouton.disabled = false;
        bouton.textContent = "Publier";
    }
});


// =========================================
// 6. DÉCONNECTER L'ADMINISTRATEUR
// =========================================

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
        logoutButton.disabled = true;

        try {
            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            afficherEtatConnecte(false);
            afficherMessage("Tu es déconnecté.");

        } catch (erreur) {
            alert("La déconnexion a échoué.");
            console.error("Erreur de déconnexion :", erreur);

        } finally {
            logoutButton.disabled = false;
        }
    });
}


// =========================================
// 7. SUIVRE LES CHANGEMENTS DE SESSION
// =========================================

supabaseClient.auth.onAuthStateChange(function (_event, session) {
    afficherEtatConnecte(Boolean(session));
});


// =========================================
// 8. DÉMARRER L'ESPACE ADMINISTRATEUR
// =========================================

verifierConnexion();
