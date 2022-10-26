module.exports = {
    "branches": ["main"],
    "plugins": [
        ["@semantic-release/commit-analyzer", {
            "releaseRules": [
                {"type": "chore", "scope": "deps", "release": "patch"},
                {"type": "docs", "release": "patch"}
            ]
        }],
        "@semantic-release/release-notes-generator",
        "@semantic-release/github",
        "@semantic-release/changelog",
        ["@semantic-release/npm", {
            "tarballDir": "release"
        }],
        "@semantic-release/git"
    ],
    "preset": "angular"
};
