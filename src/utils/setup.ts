import * as fs from 'fs';
import * as path from 'path';

export async function runSetup() {
    console.log("\n🚀 Aforsoft Second Brain MCP Server - Setup\n");

    const packageRoot = path.join(__dirname, '../../');
    const targetDir = process.cwd();

    const filesToCopy = [
        { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
        { src: 'docker-compose.full.yml', dest: 'docker-compose.full.yml' },
        { src: '.env.example', dest: '.env' }
    ];

    for (const file of filesToCopy) {
        const srcPath = path.join(packageRoot, file.src);
        const destPath = path.join(targetDir, file.dest);

        if (fs.existsSync(destPath)) {
            console.log(`⚠️  ${file.dest} already exists. Skipping.`);
        } else {
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`✅ Created ${file.dest}`);
            } else {
                console.log(`❌ Template ${file.src} not found in package.`);
            }
        }
    }

    console.log("\nNext Steps:");
    console.log("1. Update the .env file with your database credentials.");
    console.log("2. Start the database with: docker-compose up -d");
    console.log("3. Add the server to your Claude Desktop config using npx:\n");
    console.log("   npx -y @aforsoft/second-brain-mcp-server\n");
}
