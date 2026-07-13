<template>
  <div class="app">
    <div class="container">
      <header class="header">
        <h1 class="title">Clothing Management</h1>
        <p class="subtitle">Manage your wardrobe with styles</p>
      </header>

      <div class="content">
        <!-- Add/Edit Form -->
        <div class="form-section">
          <h2 class="section-title">{{ isEditing ? 'Edit Item' : 'Add New Item' }}</h2>
          <form @submit.prevent="handleSubmit" class="clothing-form">
            <div class="form-group">
              <label>Name</label>
              <input 
                v-model="formData.name" 
                type="text" 
                required 
                placeholder="Enter clothing name"
                class="form-input"
              />
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
                <input 
                  v-model="formData.color" 
                  type="text" 
                  required 
                  placeholder="Color"
                  class="form-input"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Price (฿)</label>
                <input 
                  v-model.number="formData.price" 
                  type="number" 
                  required 
                  min="0" 
                  step="0.01"
                  placeholder="0.00"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Stock</label>
                <input 
                  v-model.number="formData.stock" 
                  type="number" 
                  required 
                  min="0"
                  placeholder="0"
                  class="form-input"
                />
              </div>
            </div>
            <div class="form-group">
              <label>Image (optional)</label>
              <input 
                type="file" 
                accept="image/*"
                @change="handleFileChange"
                class="form-input"
              />
              <div v-if="imagePreview" class="image-preview">
                <img :src="imagePreview" alt="Preview" />
                <button @click="removeImage" class="remove-image-btn">×</button>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                {{ isEditing ? 'Update' : 'Add' }} Item
              </button>
              <button 
                v-if="isEditing" 
                type="button" 
                @click="resetForm" 
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Clothing List -->
        <div class="list-section">
          <h2 class="section-title">Your Wardrobe</h2>
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>Loading your wardrobe...</p>
          </div>
          <div v-else-if="clothingItems.length === 0" class="empty-state">
            <p class="empty-icon">👚</p>
            <p>Your wardrobe is empty</p>
            <p class="empty-hint">Add your first clothing item above!</p>
          </div>
          <div v-else class="clothing-grid">
            <div 
              v-for="item in clothingItems" 
              :key="item.id" 
              class="clothing-card"
            >
              <div class="card-image">
                <img 
                  v-if="item.image_url" 
                  :src="item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`" 
                  :alt="item.name"
                  @error="handleImageError"
                />
                <div v-else class="placeholder-image">
                  {{ item.category.charAt(0) }}
                </div>
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
                    {{ item.stock }} in stock
                  </span>
                </div>
                <div class="card-actions">
                  <button @click="editItem(item)" class="btn-icon btn-edit">
                    Edit
                  </button>
                  <button @click="deleteItem(item.id)" class="btn-icon btn-delete">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'

const clothingItems = ref([])
const loading = ref(true)
const isEditing = ref(false)
const editingId = ref(null)
const imageFile = ref(null)
const imagePreview = ref(null)

const formData = ref({
  name: '',
  category: '',
  size: '',
  color: '',
  price: '',
  stock: ''
})

const fetchClothing = async () => {
  try {
    loading.value = true
    const response = await axios.get(`${API_URL}/clothing`)
    clothingItems.value = response.data
  } catch (error) {
    console.error('Error fetching clothing:', error)
    alert('Failed to load clothing items')
  } finally {
    loading.value = false
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
      // Keep existing image if no new image uploaded
      if (!imageFile.value) {
        formDataToSend.append('image_url', formData.value.image_url || '')
      }
      await axios.put(`${API_URL}/clothing/${editingId.value}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      alert('Item updated successfully! 🎉')
    } else {
      await axios.post(`${API_URL}/clothing`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      alert('Item added successfully! 🎉')
    }
    resetForm()
    fetchClothing()
  } catch (error) {
    console.error('Error saving clothing:', error)
    alert('Failed to save item')
  }
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
  imagePreview.value = item.image_url ? `http://localhost:5000${item.image_url}` : null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteItem = async (id) => {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await axios.delete(`${API_URL}/clothing/${id}`)
      alert('Item deleted successfully! 🗑️')
      fetchClothing()
    } catch (error) {
      console.error('Error deleting clothing:', error)
      alert('Failed to delete item')
    }
  }
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

onMounted(() => {
  fetchClothing()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding: 2rem 1rem;
  background: radial-gradient(circle at top, #242424 0%, #080808 65%, #000000 100%);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  animation: fadeInDown 0.8s ease;
}

.title {
  font-size: 3rem;
  font-weight: 800;
  color: #f7f2e8;
  text-shadow: 0 0 22px rgba(212, 175, 55, 0.16);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(247, 242, 232, 0.76);
}

.content {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}

.form-section {
  background: linear-gradient(145deg, #151515 0%, #0d0d0d 100%);
  border: 1px solid #2e2e2e;
  border-radius: 22px;
  padding: 2rem;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55);
  animation: slideInLeft 0.6s ease;
  position: sticky;
  top: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f7f2e8;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clothing-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  color: #e8e2d4;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #3b3b3b;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #171717;
  color: #f7f2e8;
}

.form-input::placeholder {
  color: #8c8a84;
}

.form-input:focus {
  outline: none;
  border-color: #d8b24a;
  box-shadow: 0 0 0 3px rgba(216, 178, 74, 0.18);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #f3d27a 0%, #cfa53d 100%);
  color: #121212;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(207, 165, 61, 0.28);
}

.btn-secondary {
  background: #242424;
  color: #f5efe3;
}

.btn-secondary:hover {
  background: #2f2f2f;
  color: #ffffff;
}

.image-preview {
  position: relative;
  margin-top: 0.5rem;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #3b3b3b;
}

.image-preview img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 107, 107, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.remove-image-btn:hover {
  background: rgba(255, 107, 107, 1);
  transform: scale(1.1);
}

.list-section {
  animation: slideInRight 0.6s ease;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #f7f2e8;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(247, 242, 232, 0.16);
  border-top-color: #f3d27a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.empty-state {
  background: linear-gradient(145deg, #151515 0%, #0d0d0d 100%);
  border: 1px solid #2e2e2e;
  border-radius: 22px;
  padding: 4rem 2rem;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #d5d0c4;
  font-size: 1.1rem;
}

.empty-hint {
  font-size: 0.9rem;
  color: #9c968b;
  margin-top: 0.5rem;
}

.clothing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.clothing-card {
  background: linear-gradient(145deg, #181818 0%, #101010 100%);
  border: 1px solid #2e2e2e;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42);
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease;
}

.clothing-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
}

.card-image {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #252525 0%, #0d0d0d 100%);
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: 700;
  color: rgba(243, 210, 122, 0.2);
}

.category-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(243, 210, 122, 0.18);
  color: #fce9ad;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.card-content {
  padding: 1.5rem;
}

.item-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f7f2e8;
  margin-bottom: 0.75rem;
}

.item-details {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.detail {
  font-size: 0.9rem;
  color: #d4cdbf;
  background: #242424;
  border: 1px solid #3a3a3a;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
}

.item-price-stock {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.price {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f3d27a;
}

.stock {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
}

.in-stock {
  background: #173423;
  color: #8fe09a;
}

.low-stock {
  background: #3b2c12;
  color: #f0c96a;
}

.out-of-stock {
  background: #3f1717;
  color: #f1a1a1;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-edit {
  background: #2b2b2b;
  color: #f7f2e8;
}

.btn-edit:hover {
  background: #343434;
  transform: translateY(-2px);
}

.btn-delete {
  background: #7b2323;
  color: white;
}

.btn-delete:hover {
  background: #951f1f;
  transform: translateY(-2px);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
