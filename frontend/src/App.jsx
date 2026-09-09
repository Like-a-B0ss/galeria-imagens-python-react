import { useEffect, useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function App() {
  const [images, setImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true

    fetch('/api/images')
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as imagens.')
        return response.json()
      })
      .then((data) => { if (active) setImages(data) })
      .catch((error) => { if (active) setMessage({ type: 'error', text: error.message }) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  async function upload(file) {
    setMessage(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Selecione uma imagem JPEG, PNG, WebP ou GIF.' })
      return
    }
    if (file.size > MAX_SIZE) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5 MB.' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const response = await fetch('/api/images', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Falha ao enviar a imagem.')
      setImages((current) => [data, ...current])
      setMessage({ type: 'success', text: 'Imagem salva com sucesso no banco de dados.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removeImage(image, event) {
    event.stopPropagation()
    if (!window.confirm(`Excluir “${image.filename}”?`)) return
    try {
      const response = await fetch(`/api/images/${image.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Não foi possível excluir a imagem.')
      setImages((current) => current.filter((item) => item.id !== image.id))
      setMessage({ type: 'success', text: 'Imagem excluída.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <main>
      <header className="hero">
        <span className="eyebrow">Python + React</span>
        <h1>Sua galeria, em um só lugar.</h1>
        <p>Envie imagens com segurança, visualize os arquivos salvos e mantenha sua coleção organizada.</p>
      </header>

      <section className="upload-card" aria-labelledby="upload-title">
        <div>
          <h2 id="upload-title">Adicionar imagem</h2>
          <p>Formatos JPEG, PNG, WebP ou GIF · máximo de 5 MB</p>
        </div>
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            upload(event.dataTransfer.files[0])
          }}
        >
          <div className="upload-icon" aria-hidden="true">↑</div>
          <strong>{uploading ? 'Enviando imagem…' : 'Arraste uma imagem até aqui'}</strong>
          <span>ou</span>
          <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>
            Escolher arquivo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(event) => upload(event.target.files[0])}
            hidden
          />
        </div>
        {message && <p className={`message ${message.type}`} role="status">{message.text}</p>}
      </section>

      <section className="gallery" aria-labelledby="gallery-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Coleção</span>
            <h2 id="gallery-title">Imagens salvas</h2>
          </div>
          <span className="count">{images.length} {images.length === 1 ? 'imagem' : 'imagens'}</span>
        </div>

        {loading ? (
          <p className="empty">Carregando galeria…</p>
        ) : images.length === 0 ? (
          <div className="empty">
            <span aria-hidden="true">◇</span>
            <h3>Sua galeria está vazia</h3>
            <p>Envie a primeira imagem para começar.</p>
          </div>
        ) : (
          <div className="image-grid">
            {images.map((image) => (
              <article key={image.id} className="image-card" onClick={() => setSelected(image)}>
                <img src={image.url} alt={image.filename} loading="lazy" />
                <div className="image-info">
                  <div>
                    <strong title={image.filename}>{image.filename}</strong>
                    <small>{formatSize(image.size)}</small>
                  </div>
                  <div className="card-actions">
                    <button className="preview" type="button" onClick={() => setSelected(image)}>Visualizar</button>
                    <button className="delete" type="button" aria-label={`Excluir ${image.filename}`} onClick={(event) => removeImage(image, event)}>×</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Pré-visualização de ${selected.filename}`} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setSelected(null)}>×</button>
            <img src={selected.url} alt={selected.filename} />
            <div><strong>{selected.filename}</strong><span>{formatSize(selected.size)}</span></div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
