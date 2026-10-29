
console.log("Bienvenue sur le portfolio de Joseph MBANG !");

// 1. Récupérer les sections du site
const sections = document.querySelectorAll(".page-section");

// 2. Récupérer les liens et boutons de navigation
const commandesNavigation = document.querySelectorAll("[data-page]");

// 3. Fonction pour afficher la section choisie
function afficherPage(nomPage) {
    const sectionChoisie = document.querySelector(
        '.page-section[data-section="' + nomPage + '"]'
    );

    if (!sectionChoisie) {
        console.warn("Section introuvable :", nomPage);
        return;
    }

    sections.forEach(function(section) {
        const estActive = section.dataset.section === nomPage;

        section.hidden = !estActive;
        section.classList.toggle("active", estActive);
    });

    // Mettre en évidence le menu actif
    document.querySelectorAll(".navigation a[data-page]").forEach(function(lien) {
        const estActif = lien.dataset.page === nomPage;

        lien.classList.toggle("active", estActif);

        if (estActif) {
            lien.setAttribute("aria-current", "page");
        } else {
            lien.removeAttribute("aria-current");
        }
    });

    // Mettre à jour l'adresse sans recharger le site
    window.history.replaceState(null, "", "#" + nomPage);

    // Remonter en haut de la page
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// 4. Réagir aux clics sur les menus et boutons
commandesNavigation.forEach(function(element) {
    element.addEventListener("click", function(event) {
        event.preventDefault();

        const nomPage = element.getAttribute("data-page");

        // Afficher la section correspondante
        sections.forEach(function(section) {
            if (section.getAttribute("data-section") === nomPage) {
                section.hidden = false;
                section.classList.add("active");
            } else {
                section.hidden = true;
                section.classList.remove("active");
            }
        });

        // Mettre à jour le menu actif
        document.querySelectorAll(".navigation a[data-page]").forEach(function(lien) {
            lien.classList.remove("active");
            lien.removeAttribute("aria-current");
        });

        const lienActif = document.querySelector(
            '.navigation a[data-page="' + nomPage + '"]'
        );

        if (lienActif) {
            lienActif.classList.add("active");
            lienActif.setAttribute("aria-current", "page");
        }

        // Mettre à jour l'adresse du navigateur
        window.history.replaceState(null, "", "#" + nomPage);

        // Remonter en haut de la page
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});


// 6. Charger les publications depuis Supabase
const publicationsList = document.getElementById("publications-list");

async function chargerPublications() {
    if (!publicationsList) {
        return;
    }

    publicationsList.innerHTML =
        '<p class="empty-message">Chargement des publications...</p>';

    try {
        const resultat = await supabaseClient
            .from("publications")
            .select("*")
            .order("created_at", { ascending: false });

        if (resultat.error) {
            throw resultat.error;
        }

        const publications = resultat.data;

        if (!publications || publications.length === 0) {
            publicationsList.innerHTML =
                '<p class="empty-message">Aucune publication pour le moment. Reviens bientôt !</p>';
            return;
        }

        publicationsList.replaceChildren();

        publications.forEach(function(publication) {
            const carte = document.createElement("article");
            carte.className = "publication-card";

            const titre = document.createElement("h3");
            titre.textContent = publication.titre || "Sans titre";
            carte.appendChild(titre);

            if (publication.categorie) {
                const categorie = document.createElement("p");
                categorie.className = "publication-category";
                categorie.textContent = publication.categorie;
                carte.appendChild(categorie);
            }

            const contenu = document.createElement("p");
            contenu.className = "publication-content";
            contenu.textContent = publication.contenu || "";
            carte.appendChild(contenu);

            if (publication.photo_url) {
                const url = publication.photo_url;
                const estVideo = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(url);

                if (estVideo) {
                    const video = document.createElement("video");
                    video.src = url;
                    video.controls = true;
                    video.preload = "metadata";
                    video.playsInline = true;
                    video.className = "publication-media";
                    carte.appendChild(video);
                } else {
                    const image = document.createElement("img");
                    image.src = url;
                    image.alt = publication.titre || "Photo publiée";
                    image.loading = "lazy";
                    image.className = "publication-media";
                    carte.appendChild(image);
                }
            }

            if (publication.created_at) {
                const date = document.createElement("small");

                date.className = "publication-date";
                date.textContent = new Date(
                    publication.created_at
                ).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });

                carte.appendChild(date);
            }

            publicationsList.appendChild(carte);
        });

    } catch (error) {
        console.error("Erreur de chargement des publications :", error);

        publicationsList.innerHTML =
            '<p class="empty-message">Impossible de charger les publications pour le moment. Réessaie plus tard.</p>';
    }
}

chargerPublications();

// 7. Actualiser l'année du pied de page
const footer = document.querySelector(".footer p");

if (footer) {
    const annee = new Date().getFullYear();

    footer.textContent =
        "© " + annee + " Joseph MBANG — Portfolio professionnel.";
}
