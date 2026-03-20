import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/lib/api"
import { Login } from "@/_components/pages/Login"
import { Node } from "@/_components/pages/Node"
import { Signup } from "@/_components/pages/Signup"
import { logger } from "@/utils/logger"
import "@/styles/globals.css"

function IndexPopup() {
  const [currentPage, setCurrentPage] = useState<string>("loading")
  const { 
    accessToken, 
    masterKey, 
    isInitialized, 
    setInitialized, 
    restoreMasterKey 
  } = useAuthStore()

  useEffect(() => {
    // 익스텐션 환경에서만 body 크기를 강제로 지정
    if (typeof document !== 'undefined') {
      document.body.style.width = '400px'
      document.body.style.height = '600px'
      document.body.style.overflow = 'hidden'
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!isInitialized) {
        logger.log("🔍 [Popup] Initializing session...")
        try {
          // 1. 기존 세션이 있는지 확인
          await authApi.refreshSession()
          await restoreMasterKey()
          logger.log("✅ [Popup] Session restored.")
        } catch (e) {
          logger.log("ℹ️ [Popup] No existing session found.")
        } finally {
          setInitialized(true)
        }
      }
    }
    init()
  }, [isInitialized, setInitialized, restoreMasterKey])

  useEffect(() => {
    if (isInitialized) {
      if (accessToken && masterKey) {
        setCurrentPage("node")
      } else {
        setCurrentPage("login")
      }
    }
  }, [isInitialized, accessToken, masterKey])

  if (currentPage === "loading") {
    return (
      <div className="flex items-center justify-center w-[400px] h-[600px] bg-[#FBFBFA]">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[600px] overflow-hidden bg-[#FBFBFA]">
      {currentPage === "login" && <Login onNavigate={setCurrentPage} />}
      {currentPage === "node" && <Node onNavigate={setCurrentPage} />}
      {currentPage === "signup" && <Signup onNavigate={setCurrentPage} />}
    </div>
  )
}

export default IndexPopup
