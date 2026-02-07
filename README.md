# olympics
Olympics pool - auto refresh/standings

## Medal auto-update (cron)

### Setup
1. Install dependencies:
	- `npm install`
2. Run the updater manually once:
	- `node update-medals.js`

### Cron (every 5 minutes)
Add this to your crontab:

`*/5 * * * * /usr/local/bin/node /Users/chris/olympics/update-medals.js >> /Users/chris/olympics/cron.log 2>&1`

If Node is in a different location, replace `/usr/local/bin/node` with your Node path.
