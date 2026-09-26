const footprintSources = [
  {
    name: "GitHub",
    category: "developer",
    url: "https://github.com/{username}",
    api: "github",
    enabled: true,
  },

  {
    name: "Reddit",
    category: "social",
    url: "https://www.reddit.com/user/{username}",
    enabled: true,
  },

  {
    name: "Instagram",
    category: "social",
    url: "https://www.instagram.com/{username}/",
    enabled: true,
  },

  {
    name: "LinkedIn",
    category: "professional",
    url: "https://www.linkedin.com/in/{username}/",
    enabled: true,
  },

  {
    name: "YouTube",
    category: "social",
    url: "https://www.youtube.com/@{username}",
    enabled: true,
  },

  {
    name: "TikTok",
    category: "social",
    url: "https://www.tiktok.com/@{username}",
    enabled: true,
  },

  {
    name: "Facebook",
    category: "social",
    url: "https://www.facebook.com/{username}",
    enabled: true,
  },

  {
    name: "X",
    category: "social",
    url: "https://x.com/{username}",
    enabled: true,
  },
];

module.exports = footprintSources;
