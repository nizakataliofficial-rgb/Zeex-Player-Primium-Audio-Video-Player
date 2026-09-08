const audioFolderScanInput = document.getElementById("audio-folder-scan");
const videoFolderScanInput = document.getElementById("video-folder-scan");
const audioFileScanInput = document.getElementById("audio-file-scan");
const videoFileScanInput = document.getElementById("video-file-scan");
const songsContainer = document.getElementById("songs-container");
const videoContainer = document.getElementById("video-container");
const videoPlayer = document.getElementById("video-player");
const playPauseButton = document.getElementById("play-pause");
const seekBar = document.getElementById("seek-bar");
const currentTimeLabel = document.getElementById("current-time");
const durationLabel = document.getElementById("duration");
const volumeBar = document.getElementById("volume-bar");
const searchInput = document.getElementById("search-input");
const searchPanel = document.getElementById("search-panel");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const visualizerContainer = document.querySelector(".visualizer-container");

const songsList = [];
const likedSongIds = new Set();
let currentSongIndex = -1;
let mediaElement = new Audio();
const videoExtensions = /\.(mp4|webm|ogv|mov|m4v)$/i;
const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i;
let currentView = "home";
let activeMediaType = "audio";
let isShuffleOn = false;
let repeatMode = "off";

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function isVideo(track) {
    return track.type.startsWith("video/") || videoExtensions.test(track.name);
}

function getVisibleSongs() {
    const query = searchInput.value.trim().toLowerCase();
    return songsList.filter(song => {
        const matchesMediaType = activeMediaType === "video" ? isVideo(song) : !isVideo(song);
        const matchesView = currentView !== "liked" || likedSongIds.has(song.id);
        const matchesSearch = !query || `${song.title} ${song.artist}`.toLowerCase().includes(query);
        return matchesMediaType && matchesView && matchesSearch;
    });
}

function renderSongs() {
    const visibleSongs = getVisibleSongs();
    if (!visibleSongs.length) {
        songsContainer.innerHTML = `<div class="empty-library"><i class="fa-solid fa-${activeMediaType === "video" ? "video" : "music"}"></i><h3>No ${activeMediaType} files yet</h3><p>Use the scan button above to add local ${activeMediaType}.</p></div>`;
        return;
    }
    songsContainer.innerHTML = visibleSongs.map(song => `
        <article class="song-card ${likedSongIds.has(song.id) ? "is-liked" : ""}" data-id="${song.id}">
            <img src="${song.cover}" alt="${song.title}">
            <h4>${song.title}</h4>
            <p>${isVideo(song) ? "Video" : "Audio"} · ${song.artist}</p>
            <button class="card-like" data-like-id="${song.id}" title="Like"><i class="fa-${likedSongIds.has(song.id) ? "solid" : "regular"} fa-heart"></i></button>
        </article>
    `).join("");

    songsContainer.querySelectorAll(".song-card").forEach(card => {
        card.addEventListener("click", () => {
            currentSongIndex = songsList.findIndex(song => song.id === Number(card.dataset.id));
            loadSong(songsList[currentSongIndex]);
            playAudio();
        });
    });
    songsContainer.querySelectorAll(".card-like").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            toggleLike(Number(button.dataset.likeId));
        });
    });
}

function updateView(view) {
    currentView = view;
    const titles = {
        home: [activeMediaType === "video" ? "Video Player" : "Audio Player", activeMediaType === "video" ? "Scan your device to watch local videos." : "Scan your device to listen to local audio."],
        search: ["Search your library", "Find an audio track or video from your scanned files."],
        library: ["Your Library", `${getVisibleSongs().length} local ${activeMediaType} item${getVisibleSongs().length === 1 ? "" : "s"}`],
        liked: ["Liked Songs", `${getVisibleSongs().length} favorite${getVisibleSongs().length === 1 ? "" : "s"}`]
    };
    viewTitle.textContent = titles[view][0];
    viewSubtitle.textContent = titles[view][1];
    searchPanel.hidden = view !== "search";
    document.querySelectorAll(".nav-links a").forEach(link => link.classList.remove("active"));
    if (view === "home") document.getElementById("home-link").classList.add("active");
    if (view === "search") document.getElementById("search-link").classList.add("active");
    if (view === "library") document.getElementById("library-link").classList.add("active");
    renderSongs();
}

function toggleLike(songId) {
    if (likedSongIds.has(songId)) likedSongIds.delete(songId);
    else likedSongIds.add(songId);
    const currentSong = songsList[currentSongIndex];
    document.getElementById("like-btn").classList.toggle("liked", currentSong && likedSongIds.has(currentSong.id));
    updateView(currentView);
}

function loadSong(song) {
    if (mediaElement) mediaElement.pause();
    if (mediaElement !== videoPlayer) mediaElement.src = "";

    if (isVideo(song)) {
        videoContainer.hidden = false;
        mediaElement = videoPlayer;
    } else {
        videoContainer.hidden = true;
        mediaElement = new Audio();
    }

    mediaElement.src = song.src;
    mediaElement.volume = volumeBar.value / 100;
    document.getElementById("current-title").textContent = song.title;
    document.getElementById("current-artist").textContent = song.artist;
    document.getElementById("current-cover").src = song.cover;
    document.getElementById("like-btn").classList.toggle("liked", likedSongIds.has(song.id));
    mediaElement.onloadedmetadata = updateDuration;
    mediaElement.ontimeupdate = updateProgress;
    mediaElement.onended = playNext;
}

function updateDuration() {
    seekBar.max = mediaElement.duration || 0;
    durationLabel.textContent = formatTime(mediaElement.duration);
}

function updateProgress() {
    seekBar.value = mediaElement.currentTime || 0;
    currentTimeLabel.textContent = formatTime(mediaElement.currentTime);
}

function playAudio() {
    const playAttempt = mediaElement.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.then(() => {
            playPauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }).catch(() => {
            playPauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
        return;
    }
    playPauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function getModeIndexes() {
    return songsList.reduce((indexes, song, index) => {
        if (isVideo(song) === (activeMediaType === "video")) indexes.push(index);
        return indexes;
    }, []);
}

function playNext() {
    const modeIndexes = getModeIndexes();
    if (!modeIndexes.length) return;
    const modePosition = modeIndexes.indexOf(currentSongIndex);
    if (repeatMode === "one") {
        mediaElement.currentTime = 0;
        playAudio();
        return;
    }
    if (isShuffleOn && modeIndexes.length > 1) {
        let nextIndex = currentSongIndex;
        while (nextIndex === currentSongIndex) nextIndex = modeIndexes[Math.floor(Math.random() * modeIndexes.length)];
        currentSongIndex = nextIndex;
    } else if (modePosition === modeIndexes.length - 1 && repeatMode === "off") {
        mediaElement.pause();
        playPauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        return;
    } else {
        currentSongIndex = modeIndexes[(modePosition + 1) % modeIndexes.length];
    }
    loadSong(songsList[currentSongIndex]);
    playAudio();
}

function handleScannedFiles(files) {
    const mediaFiles = Array.from(files).filter(file => {
        const fileIsVideo = file.type.startsWith("video/") || videoExtensions.test(file.name);
        const fileIsAudio = file.type.startsWith("audio/") || audioExtensions.test(file.name);
        return activeMediaType === "video" ? fileIsVideo : fileIsAudio;
    });

    if (mediaFiles.length === 0) {
        alert("Koi audio ya video file nahi mili!");
        return;
    }

    const scannedTracks = mediaFiles.map((file, index) => ({
        id: Date.now() + index,
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : "Local Device",
        cover: "https://picsum.photos/id/101/300/300",
        type: file.type,
        src: URL.createObjectURL(file) 
    }));

    songsList.unshift(...scannedTracks);
    updateView(currentView);
    currentSongIndex = 0;
    loadSong(songsList[0]);
    playAudio();
}

function scanInputFiles(event) {
    const inputMediaType = event.target.dataset.mediaType;
    const previousMediaType = activeMediaType;
    activeMediaType = inputMediaType;
    handleScannedFiles(event.target.files);
    activeMediaType = previousMediaType;
    event.target.value = "";
}

audioFolderScanInput.addEventListener("change", scanInputFiles);
videoFolderScanInput.addEventListener("change", scanInputFiles);
audioFileScanInput.addEventListener("change", scanInputFiles);
videoFileScanInput.addEventListener("change", scanInputFiles);

document.querySelectorAll(".mode-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        activeMediaType = tab.dataset.mode;
        document.querySelectorAll(".mode-tab").forEach(item => {
            const isActive = item === tab;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-selected", isActive);
        });
        document.querySelectorAll(".audio-upload").forEach(item => item.hidden = activeMediaType !== "audio");
        document.querySelectorAll(".video-upload").forEach(item => item.hidden = activeMediaType !== "video");
        visualizerContainer.hidden = activeMediaType !== "audio";
        if (currentSongIndex >= 0 && songsList[currentSongIndex] && isVideo(songsList[currentSongIndex]) !== (activeMediaType === "video")) {
            videoPlayer.pause();
            videoContainer.hidden = true;
            mediaElement = new Audio();
            currentSongIndex = -1;
            playPauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        updateView("home");
    });
});

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        const view = link.id === "search-link" ? "search" : link.id === "library-link" ? "library" : "home";
        updateView(view);
        if (view === "search") searchInput.focus();
    });
});

document.getElementById("liked-playlist").addEventListener("click", () => updateView("liked"));
searchInput.addEventListener("input", renderSongs);

document.getElementById("like-btn").addEventListener("click", () => {
    if (currentSongIndex >= 0) toggleLike(songsList[currentSongIndex].id);
});

document.getElementById("shuffle").addEventListener("click", event => {
    isShuffleOn = !isShuffleOn;
    event.currentTarget.classList.toggle("active", isShuffleOn);
});

document.getElementById("repeat").addEventListener("click", event => {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    event.currentTarget.classList.toggle("active", repeatMode !== "off");
    event.currentTarget.title = `Repeat: ${repeatMode}`;
    event.currentTarget.querySelector("i").className = `fa-solid ${repeatMode === "one" ? "fa-1" : "fa-repeat"}`;
});

playPauseButton.addEventListener("click", () => {
    if (currentSongIndex < 0) return;
    if (mediaElement.paused) playAudio();
    else {
        mediaElement.pause();
        playPauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
});

seekBar.addEventListener("input", () => {
    mediaElement.currentTime = seekBar.value;
});

volumeBar.addEventListener("input", () => {
    mediaElement.volume = volumeBar.value / 100;
});

document.getElementById("next").addEventListener("click", playNext);
document.getElementById("prev").addEventListener("click", () => {
    const modeIndexes = getModeIndexes();
    if (!modeIndexes.length) return;
    const modePosition = modeIndexes.indexOf(currentSongIndex);
    currentSongIndex = modeIndexes[(modePosition - 1 + modeIndexes.length) % modeIndexes.length];
    loadSong(songsList[currentSongIndex]);
    playAudio();
});