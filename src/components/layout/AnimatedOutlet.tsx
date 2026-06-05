import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import RouteFallback from './RouteFallback'

const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

const transition = { duration: 0.28, ease: [0, 0, 0.2, 1] as [number, number, number, number] }

// Transição de entrada por rota via `key={pathname}`: ao navegar, o motion.div
// remonta e roda a animação de entrada. NÃO usamos `AnimatePresence mode="wait"`
// porque, combinado com rotas lazy (que suspendem enquanto baixam o chunk), o
// modo "wait" pode ficar travado esperando uma animação de saída que não conclui
// — deixando a próxima tela sem montar até um F5. Abrimos mão da animação de
// saída em troca de navegação 100% confiável.
export default function AnimatedOutlet() {
  const location = useLocation()
  return (
    <motion.div
      key={location.pathname}
      variants={variants}
      initial="initial"
      animate="animate"
      transition={transition}
      style={{ minHeight: '100%' }}
    >
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </motion.div>
  )
}
