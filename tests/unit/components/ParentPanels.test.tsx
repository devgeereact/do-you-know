import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChildrenPanel } from '@/components/parent/ChildrenPanel';
import { ContactPanel } from '@/components/parent/ContactPanel';
import { SwitchesPanel } from '@/components/parent/SwitchesPanel';
import * as service from '@/services/parentService';
import type { Child, ParentSwitches } from '@/types';

vi.mock('@/services/parentService');

const getToken = vi.fn(() => Promise.resolve('clerk-token'));
const child = (over: Partial<Child> = {}): Child => ({
  id: 'c1',
  nickname: 'BraveOtter42',
  avatar_id: 'fox',
  level: 'explorers',
  created_at: '2026-11-07T10:00:00Z',
  ...over,
});
const off: ParentSwitches = {
  public_boards: false,
  challenge_friend: false,
  beat_clock: false,
  slider_questions: false,
  trivia_sets: false,
  sound: false,
  easy_read: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  getToken.mockResolvedValue('clerk-token');
});

describe('ChildrenPanel', () => {
  it('lists the children with their level and offers no text box', async () => {
    vi.mocked(service.listChildren).mockResolvedValue([child()]);
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'BraveOtter42' })).toBeInTheDocument();
    expect(screen.getByText('Explorers (ages 6–8)', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('adds a child from a level and a picture only, never a typed name', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listChildren).mockResolvedValue([]);
    vi.mocked(service.addChild).mockResolvedValue(child({ level: 'scholars', avatar_id: 'owl' }));
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    await screen.findByText(/no children yet/i);
    await user.selectOptions(screen.getByLabelText('Level'), 'scholars');
    await user.click(screen.getByRole('button', { name: /owl/i }));
    await user.click(screen.getByRole('button', { name: 'Add a child' }));
    expect(service.addChild).toHaveBeenCalledWith(getToken, {
      level: 'scholars',
      avatar_id: 'owl',
    });
    expect(await screen.findByRole('heading', { name: 'BraveOtter42' })).toBeInTheDocument();
  });

  it('stops offering to add at five children', async () => {
    vi.mocked(service.listChildren).mockResolvedValue(
      ['a', 'b', 'c', 'd', 'e'].map((id) => child({ id, nickname: `Kid${id}` })),
    );
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    expect(await screen.findByText(/up to 5 children/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a child' })).not.toBeInTheDocument();
  });

  it('changes a level and re-rolls a name with a tap', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listChildren).mockResolvedValue([child()]);
    vi.mocked(service.changeChild).mockResolvedValue(child({ level: 'adventurers' }));
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    const card = screen.getByRole('article');
    await user.selectOptions(within(card).getByLabelText('Level'), 'adventurers');
    expect(service.changeChild).toHaveBeenCalledWith(getToken, 'c1', { level: 'adventurers' });
    await user.click(within(card).getByRole('button', { name: 'New name' }));
    expect(service.changeChild).toHaveBeenLastCalledWith(getToken, 'c1', { new_nickname: true });
  });

  it('asks before handing over, explains the sign-out, then hands over', async () => {
    const user = userEvent.setup();
    const onHandOver = vi.fn(() => Promise.resolve());
    vi.mocked(service.listChildren).mockResolvedValue([child()]);
    render(<ChildrenPanel getToken={getToken} onHandOver={onHandOver} />);
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'Hand over' }));
    expect(screen.getByText(/new email code/i)).toBeInTheDocument();
    expect(onHandOver).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hand over and sign out' }));
    await waitFor(() =>
      expect(onHandOver).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' })),
    );
  });

  it('asks before removing, can be cancelled, and then removes the child', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listChildren).mockResolvedValue([child()]);
    vi.mocked(service.removeChild).mockResolvedValue();
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText(/erased and cannot be brought back/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(service.removeChild).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove and erase' }));
    await waitFor(() => expect(service.removeChild).toHaveBeenCalledWith(getToken, 'c1'));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'BraveOtter42' })).not.toBeInTheDocument(),
    );
  });

  it('says so when something fails, without losing the list', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listChildren).mockResolvedValue([child()]);
    vi.mocked(service.changeChild).mockRejectedValue(new Error('network_error'));
    render(<ChildrenPanel getToken={getToken} onHandOver={vi.fn()} />);
    await screen.findByRole('heading', { name: 'BraveOtter42' });
    await user.click(screen.getByRole('button', { name: 'New name' }));
    expect(await screen.findByText(/did not work/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'BraveOtter42' })).toBeInTheDocument();
  });
});

describe('SwitchesPanel', () => {
  it('shows seven switches, all off to begin with', async () => {
    vi.mocked(service.getSwitches).mockResolvedValue(off);
    render(<SwitchesPanel getToken={getToken} />);
    const boxes = await screen.findAllByRole('switch');
    expect(boxes).toHaveLength(7);
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);
  });

  it('saves a switch as soon as it is tapped and shows the saved state', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getSwitches).mockResolvedValue(off);
    vi.mocked(service.setSwitch).mockResolvedValue({ ...off, public_boards: true });
    render(<SwitchesPanel getToken={getToken} />);
    await user.click(await screen.findByRole('switch', { name: /public boards/i }));
    expect(service.setSwitch).toHaveBeenCalledWith(getToken, 'public_boards', true);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /public boards/i })).toBeChecked(),
    );
  });

  it('puts a switch back and says so when it could not be saved', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getSwitches).mockResolvedValue(off);
    vi.mocked(service.setSwitch).mockRejectedValue(new Error('network_error'));
    render(<SwitchesPanel getToken={getToken} />);
    await user.click(await screen.findByRole('switch', { name: /beat the clock/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not save/i);
    expect(screen.getByRole('switch', { name: /beat the clock/i })).not.toBeChecked();
  });

  it('says the daily board is always on', async () => {
    vi.mocked(service.getSwitches).mockResolvedValue(off);
    render(<SwitchesPanel getToken={getToken} />);
    expect(await screen.findByText(/daily challenge board is always on/i)).toBeInTheDocument();
  });
});

describe('ContactPanel', () => {
  it('is the one place with typed fields, and sends a message of enough length', async () => {
    const user = userEvent.setup();
    vi.mocked(service.sendGrownUpMessage).mockResolvedValue();
    render(<ContactPanel getToken={getToken} />);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Your message'), 'The spelling quiz was lovely.');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(service.sendGrownUpMessage).toHaveBeenCalledWith(getToken, {
        type: 'feedback',
        message: 'The spelling quiz was lovely.',
      }),
    );
    expect(await screen.findByText(/we have your message/i)).toBeInTheDocument();
  });

  it('asks for a little more when the message is too short', async () => {
    const user = userEvent.setup();
    render(<ContactPanel getToken={getToken} />);
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'hi' } });
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 10/i);
    expect(service.sendGrownUpMessage).not.toHaveBeenCalled();
  });
});
