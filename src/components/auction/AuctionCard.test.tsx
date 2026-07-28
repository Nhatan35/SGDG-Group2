import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { auctions } from '../../services/mock/auctionService'
import { AuctionCard } from './AuctionCard'

describe('AuctionCard', () => {
  it('shows a running countdown and required metrics while time remains', () => {
    render(<MemoryRouter><AuctionCard auction={auctions[0]}/></MemoryRouter>)
    expect(screen.getByText(/Còn \d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
    expect(screen.getByText(String(auctions[0].participantCount))).toBeInTheDocument()
    expect(screen.getByText(`${auctions[0].heatScore}%`)).toBeInTheDocument()
  })

  it('keeps the detail and CTA links as siblings without nested controls', () => {
    const { container } = render(
      <MemoryRouter>
        <AuctionCard
          auction={auctions[0]}
          action={{ label: 'Vào phòng đấu giá', href: '/live' }}
        />
      </MemoryRouter>,
    )
    expect(container.querySelector('.sgdg-card')).toBeInTheDocument()
    expect(container.querySelector('a a, a button, button a')).toBeNull()
    expect(screen.getByRole('link', { name: 'Vào phòng đấu giá' })).toHaveClass(
      'sgdg-button',
    )
  })
})
