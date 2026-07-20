<template>
  <div class="app-shell">
    <div v-if="!isAuthenticated" class="auth-screen">
      <div class="auth-card">
        <div class="auth-header">
          <span class="eyebrow">Secure wardrobe access</span>
          <h1>{{ authMode === 'login' ? 'Login to your wardrobe' : 'Create your account' }}</h1>
          <p>Register and sign in with JWT to manage your clothing inventory.</p>
        </div>

        <form @submit.prevent="handleAuthSubmit" class="auth-form">
          <input v-if="authMode === 'register'" v-model="authForm.name" type="text" placeholder="Full name" required />
          <input v-model="authForm.email" type="email" placeholder="Email" required />
          <input v-model="authForm.password" type="password" placeholder="Password" required />

          <button class="btn btn-primary" type="submit" :disabled="authLoading">
            {{ authLoading ? 'Working...' : authMode === 'login' ? 'Login' : 'Register' }}
          </button>
        </form>

        <p class="auth-toggle">
          {{ authMode === 'login' ? 'New here?' : 'Already have an account?' }}
          <button type="button" @click="toggleAuthMode">
            {{ authMode === 'login' ? 'Create account' : 'Login instead' }}
          </button>
        </p>

        <p v-if="authError" class="auth-message error">{{ authError }}</p>
        <p v-else-if="authSuccess" class="auth-message success">{{ authSuccess }}</p>
      </div>
    </div>

    <div v-else class="app">
      <div class="container">
        <header class="header">
          <div class="header-text">
            <span class="eyebrow">Your closet, organized</span>
            <h1 class="title">Wardrobe</h1>
            <p class="welcome-text">Welcome, {{ currentUser?.name || currentUser?.email }}</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="logout">Logout</button>
            <button class="btn-add" @click="openAddForm">
              <span class="btn-add-icon">+</span>
              Add item
            </button>
          </div>
        </header>

        <div class="stats-strip">
          <div class="stat">
            <span class="stat-value">{{ clothingItems.length }}</span>
            <span class="stat-label">Items</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">฿{{ formatNumber(totalValue) }}</span>
            <span class="stat-label">Total value</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value" :class="{ 'stat-warning': lowStockCount > 0 }">{{ lowStockCount }}</span>
            <span class="stat-label">Running low</span>
          </div>
        </div>

        <div class="list-section">
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>Loading your wardrobe</p>
          </div>

          <div v-else-if="clothingItems.length === 0" class="empty-state">
            <div class="empty-mark"></div>
            <p class="empty-title">Nothing here yet</p>
            <p class="empty-hint">Add your first piece to start building your closet.</p>
            <button class="btn-add btn-add-empty" @click="openAddForm">
              <span class="btn-add-icon">+</span>
              Add item
            </button>
          </div>

          <div v-else class="clothing-grid">
            <div v-for="item in clothingItems" :key="item.id" class="clothing-card">
              <div class="card-image">
                <span class="tag-hole"></span>
                <img
                  v-if="item.image_url"
                  :src="item.image_url.startsWith('http') ? item.image_url : `http://localhost:5002${item.image_url}`"
                  :alt="item.name"
                  @error="handleImageError"
                />
                <div v-else class="placeholder-image">{{ item.category.charAt(0) }}</div>
                <div class="placeholder-image placeholder-fallback">{{ item.category.charAt(0) }}</div>
                <span class="category-badge">{{ item.category }}</span>
              </div>
              <div class="card-content">
                <h3 class="item-name">{{ item.name }}</h3>
                <div class="item-details">
                  <span class="detail">{{ item.size }}</span>
                  <span class="detail">{{ item.color }}</span>
                </div>
                <div class="item-price-stock">
                  <span class="price">฿{{ parseFloat(item.price || 0).toFixed(2) }}</span>
                  <span class="stock" :class="getStockClass(item.stock)">
                    <span class="stock-dot"></span>
                    {{ item.stock }} in stock
                  </span>
                </div>
                <div class="card-actions">
                  <button @click="editItem(item)" class="btn-icon btn-edit">Edit</button>
                  <button @click="deleteItem(item.id)" class="btn-icon btn-delete">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal-panel">
            <div class="modal-header">
              <h2 class="section-title">{{ isEditing ? 'Edit item' : 'Add new item' }}</h2>
              <button class="modal-close" @click="closeForm" aria-label="Close">×</button>
            </div>

            <form @submit.prevent="handleSubmit" class="clothing-form">
              <div class="form-group">
                <label>Name</label>
                <input v-model="formData.name" type="text" required placeholder="e.g. Oversized denim jacket" class="form-input" />
              </div>
              <div class="form-group">
                <label>Category</label>
                <select v-model="formData.category" required class="form-input">
                  <option value="">Select category</option>
                  <option value="T-Shirt">T-Shirt</option>
                  <option value="Shirt">Shirt</option>
                  <option value="Pants">Pants</option>
                  <option value="Dress">Dress</option>
                  <option value="Jacket">Jacket</option>
                  <option value="Hoodie">Hoodie</option>
                  <option value="Shorts">Shorts</option>
                  <option value="Skirt">Skirt</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Size</label>
                  <select v-model="formData.size" required class="form-input">
                    <option value="">Select size</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Color</label>
                  <input v-model="formData.color" type="text" required placeholder="Color" class="form-input" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Price (฿)</label>
                  <input v-model.number="formData.price" type="number" required min="0" step="0.01" placeholder="0.00" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Stock</label>
                  <input v-model.number="formData.stock" type="number" required min="0" placeholder="0" class="form-input" />
                </div>
              </div>
              <div class="form-group">
                <label>Image (optional)</label>
                <label class="file-drop">
                  <input type="file" accept="image/*" @change="handleFileChange" class="file-input" />
                  <span v-if="!imagePreview">Choose a photo</span>
                  <span v-else>Change photo</span>
                </label>
                <div v-if="imagePreview" class="image-preview">
                  <img :src="imagePreview" alt="Preview" />
                  <button type="button" @click="removeImage" class="remove-image-btn">×</button>
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">{{ isEditing ? 'Save changes' : 'Add item' }}</button>
                <button type="button" @click="closeForm" class="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
          <div class="modal-panel delete-modal">
            <div class="modal-header">
              <h2 class="section-title">Delete item</h2>
            </div>
            <p class="delete-message">Delete this item from your wardrobe?</p>
            <div class="modal-actions">
              <button @click="confirmDelete" class="btn btn-danger">Delete</button>
              <button @click="cancelDelete" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'

const clothingItems = ref([])
const loading = ref(true)
const isEditing = ref(false)
const editingId = ref(null)
const imageFile = ref(null)
const imagePreview = ref(null)
const showForm = ref(false)
const showDeleteModal = ref(false)
const deleteItemId = ref(null)
const authMode = ref('login')
const authLoading = ref(false)
const authError = ref('')
const authSuccess = ref('')
const currentUser = ref(null)
const token = ref('')
const isAuthenticated = computed(() => Boolean(token.value))

const formData = ref({
  name: '',
  category: '',
  size: '',
  color: '',
  price: '',
  stock: ''
})

const authForm = ref({
  name: '',
  email: '',
  password: ''
})

const totalValue = computed(() =>
  clothingItems.value.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.stock) || 0), 0)
)

const lowStockCount = computed(() =>
  clothingItems.value.filter((item) => item.stock > 0 && item.stock < 5).length
)

const formatNumber = (num) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const getAuthHeaders = () => {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}

const saveSession = (newToken, user) => {
  token.value = newToken
  currentUser.value = user
  localStorage.setItem('jwt_token', newToken)
  localStorage.setItem('user', JSON.stringify(user))
}

const clearSession = () => {
  token.value = ''
  currentUser.value = null
  clothingItems.value = []
  localStorage.removeItem('jwt_token')
  localStorage.removeItem('user')
}

const fetchClothing = async () => {
  if (!token.value) return

  try {
    loading.value = true
    const response = await axios.get(`${API_URL}/clothing`, { headers: getAuthHeaders() })
    clothingItems.value = response.data
  } catch (error) {
    console.error('Error fetching clothing:', error)
    if (error.response?.status === 401 || error.response?.status === 403) {
      logout(false)
    } else {
      alert('Could not load your wardrobe. Please try again.')
    }
  } finally {
    loading.value = false
  }
}

const handleAuthSubmit = async () => {
  authError.value = ''
  authSuccess.value = ''
  authLoading.value = true

  try {
    const endpoint = authMode.value === 'register' ? 'register' : 'login'
    const payload = authMode.value === 'register'
      ? { name: authForm.value.name, email: authForm.value.email, password: authForm.value.password }
      : { email: authForm.value.email, password: authForm.value.password }

    const response = await axios.post(`${API_URL}/auth/${endpoint}`, payload)
    const { token: newToken, user } = response.data
    saveSession(newToken, user)
    authSuccess.value = authMode.value === 'register' ? 'Account created successfully!' : 'Login successful!'
    authForm.value = { name: '', email: '', password: '' }
    await fetchClothing()
  } catch (error) {
    authError.value = error.response?.data?.error || 'Authentication failed'
  } finally {
    authLoading.value = false
  }
}

const toggleAuthMode = () => {
  authMode.value = authMode.value === 'login' ? 'register' : 'login'
  authError.value = ''
  authSuccess.value = ''
}

const logout = (showMessage = true) => {
  clearSession()
  if (showMessage) {
    authSuccess.value = 'You have been logged out.'
  }
}

const handleSubmit = async () => {
  try {
    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.value.name)
    formDataToSend.append('category', formData.value.category)
    formDataToSend.append('size', formData.value.size)
    formDataToSend.append('color', formData.value.color)
    formDataToSend.append('price', formData.value.price)
    formDataToSend.append('stock', formData.value.stock)

    if (imageFile.value) {
      formDataToSend.append('image', imageFile.value)
    }

    if (isEditing.value) {
      if (!imageFile.value) {
        formDataToSend.append('image_url', formData.value.image_url || '')
      }
      await axios.put(`${API_URL}/clothing/${editingId.value}`, formDataToSend, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      })
    } else {
      await axios.post(`${API_URL}/clothing`, formDataToSend, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      })
    }
    closeForm()
    fetchClothing()
  } catch (error) {
    console.error('Error saving clothing:', error)
    alert('Could not save this item. Please check the details and try again.')
  }
}

const openAddForm = () => {
  resetForm()
  showForm.value = true
}

const editItem = (item) => {
  isEditing.value = true
  editingId.value = item.id
  formData.value = {
    name: item.name,
    category: item.category,
    size: item.size,
    color: item.color,
    price: item.price,
    stock: item.stock,
    image_url: item.image_url || ''
  }
  imageFile.value = null
  imagePreview.value = item.image_url ? `http://localhost:5002${item.image_url}` : null
  showForm.value = true
}

const deleteItem = (id) => {
  deleteItemId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    await axios.delete(`${API_URL}/clothing/${deleteItemId.value}`, { headers: getAuthHeaders() })
    showDeleteModal.value = false
    deleteItemId.value = null
    fetchClothing()
  } catch (error) {
    console.error('Error deleting clothing:', error)
    alert('Could not delete this item. Please try again.')
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  deleteItemId.value = null
}

const closeForm = () => {
  showForm.value = false
  resetForm()
}

const resetForm = () => {
  isEditing.value = false
  editingId.value = null
  imageFile.value = null
  imagePreview.value = null
  formData.value = {
    name: '',
    category: '',
    size: '',
    color: '',
    price: '',
    stock: ''
  }
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    imageFile.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

const removeImage = () => {
  imageFile.value = null
  imagePreview.value = null
}

const getStockClass = (stock) => {
  if (stock === 0) return 'out-of-stock'
  if (stock < 5) return 'low-stock'
  return 'in-stock'
}

const handleImageError = (event) => {
  event.target.style.display = 'none'
  event.target.nextElementSibling.style.display = 'flex'
}

onMounted(async () => {
  const storedToken = localStorage.getItem('jwt_token')
  const storedUser = localStorage.getItem('user')

  if (!storedToken) {
    loading.value = false
    return
  }

  token.value = storedToken
  if (storedUser) {
    currentUser.value = JSON.parse(storedUser)
  }

  try {
    const response = await axios.get(`${API_URL}/auth/me`, { headers: getAuthHeaders() })
    currentUser.value = response.data.user
    localStorage.setItem('user', JSON.stringify(response.data.user))
    await fetchClothing()
  } catch (error) {
    console.error('Error validating session:', error)
    logout(false)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.app {
  --bg: #ffffff;
  --surface: #faf9f7;
  --ink: #16161a;
  --ink-soft: #7a7873;
  --line: #ebe9e4;
  --accent: #ff4d6d;
  --accent-soft: #ffe4e9;
  --violet: #6d5aff;
  --mint: #12b76a;
  --mint-soft: #e3f9ee;
  --amber: #d99a1b;
  --amber-soft: #fbf0d9;
  --danger: #e0454f;
  --danger-soft: #fce9ea;

  min-height: 100vh;
  padding: 3rem 1.5rem 5rem;
  background: var(--bg);
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}

.container {
  max-width: 1180px;
  margin: 0 auto;
}

/* Header */
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  white-space: nowrap;
}

.btn-add:hover {
  background: var(--accent);
  transform: translateY(-2px);
}

.btn-add-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.btn-add-empty {
  margin-top: 0.5rem;
}

/* Stats strip */
.stats-strip {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem 2rem;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--ink);
}

.stat-value.stat-warning {
  color: var(--amber);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  align-self: stretch;
  background: var(--line);
}

/* Section title (used in modal) */
.section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  color: var(--ink-soft);
  gap: 1rem;
}

.spinner {
  width: 42px;
  height: 42px;
  border: 3px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 5rem 2rem;
  border-radius: 24px;
  background: var(--surface);
  border: 1px dashed var(--line);
}

.empty-mark {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 2px solid var(--accent);
  margin-bottom: 1.25rem;
  position: relative;
}

.empty-mark::before,
.empty-mark::after {
  content: '';
  position: absolute;
  background: var(--accent);
}

.empty-mark::before {
  width: 22px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.empty-mark::after {
  width: 2px;
  height: 22px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.empty-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.4rem;
}

.empty-hint {
  font-size: 0.95rem;
  color: var(--ink-soft);
  margin-bottom: 1.5rem;
}

/* Grid + cards */
.clothing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}

.clothing-card {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.clothing-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(22, 22, 26, 0.08);
}

.card-image {
  position: relative;
  height: 210px;
  background: var(--surface);
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tag-hole {
  position: absolute;
  top: 0.9rem;
  left: 0.9rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  border: 1.5px solid var(--line);
  z-index: 2;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--line);
}

.placeholder-fallback {
  display: none;
  position: absolute;
  inset: 0;
}

.category-badge {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  background: #ffffff;
  color: var(--ink);
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--line);
}

.card-content {
  padding: 1.3rem 1.4rem 1.5rem;
}

.item-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.6rem;
}

.item-details {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.detail {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
}

.item-price-stock {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.1rem;
}

.price {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent);
}

.stock {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
}

.stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.in-stock {
  background: var(--mint-soft);
  color: var(--mint);
}
.in-stock .stock-dot { background: var(--mint); }

.low-stock {
  background: var(--amber-soft);
  color: var(--amber);
}
.low-stock .stock-dot { background: var(--amber); }

.out-of-stock {
  background: var(--danger-soft);
  color: var(--danger);
}
.out-of-stock .stock-dot { background: var(--danger); }

.card-actions {
  display: flex;
  gap: 0.6rem;
}

.btn-icon {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  color: var(--ink);
}

.btn-edit:hover {
  border-color: var(--ink);
  background: var(--ink);
  color: #fff;
}

.btn-delete {
  color: var(--danger);
  border-color: var(--danger-soft);
}

.btn-delete:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 22, 26, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 50;
}

.modal-panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 30px 60px rgba(22, 22, 26, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 1.3rem;
  line-height: 1;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Form */
.clothing-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  font-weight: 600;
  color: var(--ink);
  font-size: 0.85rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
  background: var(--surface);
  color: var(--ink);
}

.form-input::placeholder {
  color: #b3b0a8;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.file-drop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1rem;
  border: 1px dashed var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-drop:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 0.9rem;
  margin-top: 0.4rem;
}

.btn {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 999px;
  font-size: 0.95rem;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.btn-primary {
  background: var(--ink);
  color: #fff;
}

.btn-primary:hover {
  background: var(--accent);
}

.btn-secondary {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
}

.btn-secondary:hover {
  background: #f0efec;
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-danger:hover {
  background: #c0373d;
}

.delete-modal {
  max-width: 380px;
  text-align: center;
  padding: 2.5rem 2rem;
}

.delete-message {
  font-size: 1.05rem;
  color: var(--ink);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.9rem;
}

.image-preview {
  position: relative;
  margin-top: 0.25rem;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.image-preview img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(22, 22, 26, 0.75);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-image-btn:hover {
  background: var(--danger);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .stats-strip {
    gap: 1.25rem;
    padding: 1.25rem 1.5rem;
  }
}
</style>