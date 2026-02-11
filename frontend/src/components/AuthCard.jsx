import React from 'react'
import { Link } from 'react-router-dom'

export default function AuthCard({ title, children, footer, subText, subLinkText, subLinkHref }){
  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-decor" />
      </div>
      <div className="auth-center">
  <div className="auth-card auth-appear">
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <div className="auth-logo" aria-hidden>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#0ea5a4"/><path d="M7 12l3 3 7-8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 style={{ margin:6 }}>{title}</h2>
            <div className="auth-sub">{subText || (<>Don't have an account yet? <Link to="/register">Sign up</Link></>)}</div>
          </div>
          <div className="auth-body">{children}</div>
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
