import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './States'
export class ErrorBoundary extends Component<{children:ReactNode},{hasError:boolean}>{state={hasError:false};static getDerivedStateFromError(){return{hasError:true}}componentDidCatch(error:Error,info:ErrorInfo){console.error('Application error',error,info)}render(){return this.state.hasError?<ErrorState retry={()=>this.setState({hasError:false})}/>:this.props.children}}
