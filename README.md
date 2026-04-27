# Second Brain MCP Server

Bu proje, projeleriniz için kalıcı ve semantik olarak aranabilir bir hafıza (Second Brain) sağlayan bir Model Context Protocol (MCP) sunucusudur. Ollama kullanarak embedding üretir ve PostgreSQL (pgvector) üzerinde depolar.

## Özellikler

- **Semantik Arama:** Kaydedilen bilgileri anlamlarına göre arayın.
- **Proje Bazlı Hafıza:** Farklı projeler için ayrı hafıza alanları oluşturun.
- **Dosya İçe Aktarma:** Yerel dosyaları doğrudan sisteme öğretin.
- **Durable Knowledge:** Kararlar, mimari notlar ve SOP'lar için kalıcı depolama.

## Ön Gereksinimler

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (Veritabanı için)
- [Ollama](https://ollama.ai/) (Embedding üretimi için)

## Kurulum

1. **Repoyu klonlayın:**
   ```bash
   git clone <repo-url>
   cd second-brain-mcp-server
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Veritabanını başlatın:**
   Sadece veritabanını (pgvector) başlatmak için:
   ```bash
   docker-compose up -d
   ```

   **Alternatif:** Hem veritabanını hem de Ollama'yı (modeli otomatik çekerek) başlatmak için:
   ```bash
   docker-compose -f docker-compose.full.yml up -d
   ```

   > [!NOTE]
   > `docker-compose.full.yml` kullanıldığında, `ollama` servisi `nomic-embed-text` modelini başlangıçta otomatik olarak indirmeye çalışacaktır. Bu işlem internet hızınıza bağlı olarak birkaç dakika sürebilir.

4. **Ollama Modelini Hazırlayın:**
   Embedding için kullanılacak modeli indirin (Varsayılan: `nomic-embed-text`):
   ```bash
   ollama pull nomic-embed-text
   ```

## Yapılandırma (.env)

`.env.example` dosyasını `.env` olarak kopyalayın ve ayarlarınızı yapın:

```env
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=second_brain
DB_HOST=localhost
DB_PORT=5433
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_HOST=http://localhost:11434
```

## Kullanım

### Sunucuyu Başlatma ve Test

Projeyi derleyin ve başlatın:

```bash
npm run build
npm start
```

Mantıksal testi çalıştırmak için:
```bash
npm run test
```

### MCP Araçları (Tools)

Bu sunucu aşağıdaki araçları sağlar:

1.  **`create_memory`**: Yeni bir bilgi kaydeder.
    - `project_name`: Proje adı.
    - `content`: Kaydedilecek metin.
    - `memory_type`: (Opsiyonel) 'architecture', 'decision', 'sop', vb.

2.  **`search_memory`**: Kayıtlı bilgiler arasında semantik arama yapar.
    - `project_name`: Hangi projede aranacağı.
    - `query`: Arama sorgusu.
    - `limit`: (Opsiyonel) Dönecek sonuç sayısı.

3.  **`ingest_file`**: Yerel bir dosyayı okur ve hafızaya ekler.
    - `project_name`: Hedef proje.
    - `file_path`: Dosyanın tam yolu.

4.  **`get_recent_context`**: Bir projedeki son eklenen kayıtları getirir.

5.  **`get_graph_connections`**: Belirli bir konsepte yapılan açık referansları ([[concept]]) ve "backlink"leri bulur. Çift yönlü bağlantı (bidirectional linking) sağlar.

### Claude Desktop Entegrasyonu

Claude Desktop'ta kullanmak için `claude_desktop_config.json` dosyanıza şu eklemeyi yapın:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "node",
      "args": ["C:/yol/to/second-brain-mcp-server/build/index.js"],
      "env": {
        "DB_USER": "postgres",
        "DB_PASSWORD": "password",
        "DB_NAME": "second_brain",
        "DB_HOST": "localhost",
        "DB_PORT": "5433",
        "OLLAMA_EMBEDDING_MODEL": "nomic-embed-text",
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

## Geliştirme

Değişiklik yaptıktan sonra tekrar build almayı unutmayın:
```bash
npm run build
```
