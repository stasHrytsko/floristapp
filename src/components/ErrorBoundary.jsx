import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <p className="text-5xl mb-4">🌸</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Что-то пошло не так</h2>
          <p className="text-sm text-gray-500 mb-6">Попробуйте перезагрузить страницу</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white text-sm py-3 px-6 rounded-xl"
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
