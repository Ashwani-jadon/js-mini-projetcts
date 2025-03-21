let repoPage = 1; // Track current page
const perPage = 6; // Number of repos per request

function updateProfileImage(imageUrl) {
    const profilePic = document.getElementById("avatar");

    if (imageUrl) {
        profilePic.src = imageUrl;
        profilePic.classList.remove("default");
    } else {
        profilePic.src = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
        profilePic.classList.add("default");
    }
}

async function fetchGitHubProfile() {
    const username = document.getElementById("username").value.trim();
    if (!username) return alert("Enter a username!");

    try {
        const userResponse = await fetch(`https://api.github.com/users/${username}`);
        if (!userResponse.ok) throw new Error("User not found");
        const userData = await userResponse.json();

        // Update Profile Info
        document.getElementById("name").textContent = userData.name || "No Name";
        document.getElementById("bio").textContent = userData.bio || "No bio available";
        document.getElementById("followers").textContent = userData.followers;
        document.getElementById("following").textContent = userData.following;
        document.getElementById("repo-count").textContent = userData.public_repos;
        document.getElementById("github-profile-link").href = userData.html_url;

        // Update Profile Image
        updateProfileImage(userData.avatar_url);

        // Fetch additional data
        fetchRepositories(username);
        fetchContributions(username);
        fetchTechStack(username); // <--- Add this to load the Tech Stack chart
    } catch (error) {
        alert(error.message);
        updateProfileImage(null);
    }
}


async function fetchRepositories(username, isLoadMore = false) {
    const repoContainer = document.getElementById("repos-container");
    const loadMoreBtn = document.getElementById("load-more");

    if (!isLoadMore) {
        repoContainer.innerHTML = "Loading...";
    }

    try {
        const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${repoPage}`);
        const repoData = await repoResponse.json();

        if (!isLoadMore) repoContainer.innerHTML = ""; // Clear previous results

        repoData.forEach(repo => {
            const repoElement = document.createElement("div");
            repoElement.classList.add("repo-card");
            repoElement.innerHTML = `
                <a href="${repo.html_url}" target="_blank" class="repo-link">
                    <strong>${repo.name}</strong>
                </a>
                <br>
                ⭐ ${repo.stargazers_count} | Forks: ${repo.forks_count}
            `;

            // Tooltip for repo info
            repoElement.setAttribute("title", `Description: ${repo.description || "No description"}\nLanguage: ${repo.language || "Unknown"}`);
            repoContainer.appendChild(repoElement);
        });

        if (repoData.length === perPage) {
            loadMoreBtn.style.display = "block";
        } else {
            loadMoreBtn.style.display = "none";
        }
    } catch (error) {
        repoContainer.innerHTML = "Error loading repositories.";
        console.error("Error fetching repositories:", error);
    }
}

async function fetchContributions(username) {
    const contributionsContainer = document.getElementById("contributions");
    contributionsContainer.innerHTML = "Loading...";

    try {
        const response = await fetch(`https://api.github.com/users/${username}/events/public`);
        const events = await response.json();

        const pushEvents = events.filter(event => event.type === "PushEvent");

        if (pushEvents.length === 0) {
            contributionsContainer.innerHTML = "No recent contributions found.";
            return;
        }

        let contributionsHTML = "<ul>";
        pushEvents.slice(0, 5).forEach(event => {
            const repoName = event.repo.name;
            const commitCount = event.payload.commits.length;
            contributionsHTML += `<li>${repoName}: ${commitCount} commits</li>`;
        });
        contributionsHTML += "</ul>";

        contributionsContainer.innerHTML = contributionsHTML;
    } catch (error) {
        contributionsContainer.innerHTML = "Error fetching contributions.";
        console.error("Error fetching contributions:", error);
    }
}

// Load more repositories event listener
document.getElementById("load-more").addEventListener("click", () => {
    repoPage++;
    fetchRepositories(document.getElementById("username").value, true);
});

// Theme toggle event listener
document.getElementById("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    document.getElementById("theme-toggle").textContent =
        document.body.classList.contains("light-mode") ? "🌙" : "☀️";
});


async function fetchTechStack(username) {
    const techStackCanvas = document.getElementById("techStackChart").getContext("2d");
    try {
        const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
        const repoData = await repoResponse.json();

        if (!repoData.length) {
            document.querySelector(".tech-stack").innerHTML = "<h3>No repositories found.</h3>";
            return;
        }

        // Count occurrences of each programming language
        let languageUsage = {};
        repoData.forEach(repo => {
            if (repo.language) {
                languageUsage[repo.language] = (languageUsage[repo.language] || 0) + 1;
            }
        });

        // Convert counts to percentages
        const totalRepos = Object.values(languageUsage).reduce((sum, count) => sum + count, 0);
        const languageLabels = Object.keys(languageUsage);
        const languageData = Object.values(languageUsage).map(count => ((count / totalRepos) * 100).toFixed(2));

        // Colors for the pie chart
        const colors = [
            "#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#9966FF", "#00C49F", "#FF9F40"
        ];

        // Destroy previous chart if exists
        if (window.myTechStackChart) window.myTechStackChart.destroy();

        // Create Pie Chart
        window.myTechStackChart = new Chart(techStackCanvas, {
            type: "pie",
            data: {
                labels: languageLabels,
                datasets: [{
                    data: languageData,
                    backgroundColor: colors.slice(0, languageLabels.length),
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching tech stack data:", error);
    }
}
