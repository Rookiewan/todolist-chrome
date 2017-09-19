;(() => {
  class IndexedDBHelper {
    constructor (options) {
      this._options = Object.assign({
        name: 'todolist',
        version: 1,
        tables: [
          {
            name: 'demo',
            primaryKey: 'id',
            autoIncrement: true
          }
        ]
      }, options)
      this.db = null
      this.request = null
    }
    open () {
      return new Promise((resolve, reject) => {
        if (this.request) {
          resolve()
          return
        }
        this.request = window.indexedDB.open(this._options.name, this._options.version)
        this.request.onerror = e => {
          console.log('open error')
          reject()
        }
        this.request.onsuccess = e => {
          this.db = e.target.result
          resolve()
        }
        this.request.onupgradeneeded = e => {
          this.db = e.target.result
          console.log(`DB version changed to ${this._options.version}`)
          console.log(this)
          this._options.tables.map(table => {
            console.log(!this.db.objectStoreNames.contains(table.name))
            if (!this.db.objectStoreNames.contains(table.name)) {
              this.db.createObjectStore(table.name, {
                autoIncrement: !!table.autoIncrement,
                keyPath: table.primaryKey || 'id'
              })
            }
          })
          resolve()
        }
      })
    }
    close () {
      this.request = null
      this.db.close()
      this.db = null
    }
    delete () {
      this.request = null
      this.db = null
      window.indexedDB.deleteDatabase(this._options.name)
    }
    createTable (name, primaryKey = 'id') {
      if (this.db.objectStoreNames.contains(name)) {
        // 该表已存在
        return
      }
      this.db.createObjectStore(name, {
        keyPath: primaryKey
      })
    }
    put (table, data) {
      let transaction = this.db.transaction(table, 'readwrite')
      let store = transaction.objectStore(table)
      let req = store.put(data)
      req.onerror = () => {
        console.log('更新成功')
      }
      req.onsuccess = () => {
        console.log('添加成功')
      }
    }
    query (table, key = '') {
      return new Promise((resolve, reject) => {
        if (key === '') {
          reject()
        }
        let transaction = this.db.transaction(table, 'readwrite')
        let store = transaction.objectStore(table)
        let req = store.get(key)
        req.onerror = e => {
          reject(e)
        }
        req.onsuccess = e => {
          resolve(e.target.result)
        }
      })
    }
  }
  class Todolist {
    constructor () {
      this.input  = null
      this.listContainer = null
      this.listItems = []
      this.items = []
      this.itemTemplate = `
        <li class="{{done}}">
          {{text}}
          <div class="options">
            <i class="icon icon-delete" data-index="{{index}}"></i>
          </div>
        </li>
      `
      this.currDate = ''
      this.dbHelper = null
      this._init()
    }
    
    async _init () {
      let date = new Date()
      this.currDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      this.dbHelper = new IndexedDBHelper({
        tables: [
          {
            name: 'tododata',
            primaryKey: 'date'
          }
        ]
      })
      await this.dbHelper.open()
      let res = await this.dbHelper.query('tododata', this.currDate)
      if (res) {
        this.items = res.items
      }
      this.listContainer = document.querySelector('#todolist')
      this.listContainer.addEventListener('click', e => {
        let { target } = e
        if (target.tagName.toLowerCase() === 'li') {
          // 点击 li item
          let index = target.querySelector('.icon-delete').getAttribute('data-index')
          this._toggleItemStatus(index)
        } else if (target.tagName.toLowerCase() === 'i' && /icon-delete/.test(target.className)) {
          // 按下删除
          let index = target.getAttribute('data-index')
          this._handleDelete(index)
        }
      }, false)
      try {
        this.listItems = Array.from(this.listContainer.children)
      } catch (err) {}
      this.input = document.querySelector('input')
      this.input.addEventListener('keyup', e => {
        if (e.keyCode === 13) {
          // 按下 enter 键
          this._handleInput()
        }
      }, false)
      this._renderItems()
    }
    _handleInput () {
      let value = this.input.value.trim()
      let repeat = this.items.some(_ => _.text === value)
      if (repeat || value === '') {
        // 重复事件 或 为空
        return
      }
      this.items.unshift({
        text: value,
        done: false
      })
      this.input.value = ''
      this._renderItems()
      this._saveData()
    }
    _handleDelete (index) {
      this.items.splice(index, 1)
      this._renderItems()
      this._saveData()
    }
    _toggleItemStatus (index) {
      this.items[index].done = !this.items[index].done
      this._renderItems()
      this._saveData()
    }
    _renderItems () {
      this.listContainer.innerHTML = ''
      this.items.map((item, index) => {
        this.listContainer.appendChild(this._convertNode(this.itemTemplate.replace('{{done}}', item.done ? 'done' : '')
                                                                          .replace('{{text}}', `${index + 1}. ${item.text}`)
                                                                          .replace('{{index}}', index)))
      })
    }
    _convertNode (htmlText) {
      let div = document.createElement('div')
      div.innerHTML = htmlText
      return div.children[0]
    }
    _saveData () {
      this.dbHelper.put('tododata', {
        date: this.currDate,
        items: this.items
      })
    }
  }
  new Todolist()
})()