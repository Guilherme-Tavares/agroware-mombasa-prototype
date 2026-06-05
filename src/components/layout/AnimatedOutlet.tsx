import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import RouteFallback from './RouteFallback'

const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 8 },
}

const transition = { duration: 0.28, ease: [0, 0, 0.2, 1] as [number, number, number, number] }

export default function AnimatedOutlet() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        style={{ minHeight: '100%' }}
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
