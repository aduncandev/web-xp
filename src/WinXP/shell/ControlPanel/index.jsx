import React, { useState, useEffect, useMemo } from 'react';

import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import * as usersApi from '../../../context/users';
import { requestPower } from '../../shellBus';
import XPButton from '../../../components/XPButton';
import FileDialog from '../../../components/FileDialog';
import FolderOptions from '../../../components/FolderOptions';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getArt } from '../../../xpArt';

import controlIcon from 'assets/windowsIcons/300(32x32).png';
import helpIcon from 'assets/windowsIcons/747(16x16).png';
import updateIcon from 'assets/windowsIcons/322(16x16).png';

import { UserAccountsIcon, DateTimeIcon } from './icons';
import { DESK_CPL, CATEGORIES, CLASSIC_APPLETS } from './categories';
import { safe, fileToAccountPicture } from './helpers';
import { Root } from './styles';

// "Browse for more pictures..." offers what the (virtual) computer holds —
// the picker is the real XP Open dialog over the VFS, for immersion; only
// the downscaled result lands in the account registry.
const PICTURE_FILTERS = [
  {
    label: 'Image Files (*.bmp;*.png;*.jpg;*.gif)',
    extensions: ['.bmp', '.png', '.jpg', '.jpeg', '.gif', '.ico'],
  },
  { label: 'All Files (*.*)', extensions: null },
];

/** Faint Control Panel clipboard-and-checkmark watermark (lower right).
 *  Prefers the genuine ControlPanel.png art, ghosted; the drawn outline is
 *  only the fallback. */
const Watermark = () => {
  const real = getArt('ControlPanel', null);
  if (real) {
    return (
      <img
        className="cp__watermark cp__watermark--real"
        src={real}
        alt=""
        width={330}
        height={330}
        draggable={false}
      />
    );
  }
  return <WatermarkDrawn />;
};

const WatermarkDrawn = () => (
  <svg
    className="cp__watermark"
    viewBox="0 0 100 122"
    width="270"
    height="330"
    aria-hidden="true"
  >
    <rect
      x="12"
      y="10"
      width="76"
      height="104"
      rx="6"
      fill="none"
      stroke="#1a2f7a"
      strokeWidth="5"
    />
    <rect x="34" y="3" width="32" height="15" rx="4" fill="#1a2f7a" />
    <path
      d="M30 64 L47 86 L80 36"
      fill="none"
      stroke="#1a2f7a"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// The UA form pages live at module level on purpose: defined inside the
// ControlPanel component they get a fresh component identity on every parent
// re-render, so React remounts the form and wipes its fields mid-typing.
function UaCreatePage({ avatars, dlg, vfs, onDone, onCancel }) {
  const [name, setName] = useState('');
  const [avatarKey, setAvatarKey] = useState(Object.keys(avatars)[0] || '');
  const [pickingPicture, setPickingPicture] = useState(false);
  const onPicturePicked = async path => {
    setPickingPicture(false);
    try {
      const blob = await vfs.readBinaryFile(path);
      if (!blob) throw new Error('unreadable');
      setAvatarKey(await fileToAccountPicture(blob));
    } catch {
      dlg.alert(
        'That file could not be used as a picture. Choose a different image file.',
        'User Accounts',
        { icon: 'error' },
      );
    }
  };
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      dlg.alert('Type a name for the new account.', 'User Accounts', {
        icon: 'warning',
      });
      return;
    }
    const res = safe(() => usersApi.createUser(trimmed, avatarKey), {
      ok: false,
    });
    if (res && res.ok === false) {
      dlg.alert(
        res.error === 'exists'
          ? `The account name ${trimmed} is already in use. Type a different name.`
          : res.error || 'The account could not be created.',
        'User Accounts',
        { icon: 'error' },
      );
      return;
    }
    if (vfs.createUserProfile) vfs.createUserProfile(trimmed);
    onDone();
  };
  return (
    <div className="cp__main cp__main--ua">
      <div className="cp__ua-banner">
        <UserAccountsIcon size={38} />
        <span>Create a new account</span>
      </div>
      <div className="cp__subtitle">
        Type a name for the new account and pick a picture:
      </div>
      <input
        className="cp__input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
        }}
        spellCheck={false}
        autoFocus
      />
      <div className="cp__avatar-grid">
        {usersApi.isCustomAvatar(avatarKey) && (
          <img
            src={avatarKey}
            alt=""
            width={48}
            height={48}
            className="cp__avatar cp__avatar--sel"
          />
        )}
        {Object.entries(avatars).map(([key, src]) => (
          <img
            key={key}
            src={src}
            alt=""
            width={48}
            height={48}
            className={
              key === avatarKey ? 'cp__avatar cp__avatar--sel' : 'cp__avatar'
            }
            onClick={() => setAvatarKey(key)}
          />
        ))}
      </div>
      <div className="cp__task" onClick={() => setPickingPicture(true)}>
        <span className="cp__task-arrow">→</span>
        Browse for more pictures...
      </div>
      {pickingPicture && (
        <FileDialog
          mode="open"
          title="Browse for more pictures"
          initialPath={SPECIAL_FOLDERS.MY_PICTURES}
          filters={PICTURE_FILTERS}
          onSelect={onPicturePicked}
          onCancel={() => setPickingPicture(false)}
        />
      )}
      <div className="cp__buttons">
        <XPButton onClick={submit}>Create Account</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

function UaPasswordPage({
  user,
  hasPw,
  initialHint,
  avatarSrc,
  dlg,
  onDone,
  onCancel,
}) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [hint, setHint] = useState(initialHint);
  const submit = () => {
    if (!pw) {
      dlg.alert('Type a password.', 'User Accounts', { icon: 'warning' });
      return;
    }
    if (pw !== confirmPw) {
      dlg.alert(
        'The passwords you typed do not match. Please retype the new password in both boxes.',
        'User Accounts',
        { icon: 'warning' },
      );
      setPw('');
      setConfirmPw('');
      return;
    }
    safe(() => usersApi.setUserPassword(user.name, pw, hint.trim()), null);
    onDone();
  };
  const onEnter = e => {
    if (e.key === 'Enter') submit();
  };
  return (
    <div className="cp__main cp__main--ua">
      <div className="cp__ua-banner">
        <img src={avatarSrc(user.avatarKey)} alt="" width={38} height={38} />
        <span>
          {hasPw
            ? `Change ${user.name}'s password`
            : `Create a password for ${user.name}'s account`}
        </span>
      </div>
      <div className="cp__pwform">
        <label htmlFor="cp-pw-new">Type a new password:</label>
        <input
          id="cp-pw-new"
          type="password"
          className="cp__input"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={onEnter}
          autoFocus
        />
        <label htmlFor="cp-pw-confirm">
          Type the new password again to confirm:
        </label>
        <input
          id="cp-pw-confirm"
          type="password"
          className="cp__input"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          onKeyDown={onEnter}
        />
        <label htmlFor="cp-pw-hint">
          Type a word or phrase to use as a password hint:
        </label>
        <input
          id="cp-pw-hint"
          className="cp__input"
          value={hint}
          onChange={e => setHint(e.target.value)}
          onKeyDown={onEnter}
          spellCheck={false}
        />
        <div className="cp__pwnote">
          The password hint will be visible to everyone who uses this computer.
        </div>
      </div>
      <div className="cp__buttons">
        <XPButton onClick={submit}>
          {hasPw ? 'Change Password' : 'Create Password'}
        </XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

/*
 * Control Panel was a namespace of Explorer, so Explorer mounts this body
 * at the 'Control Panel' path and encodes the view in its own history —
 * which is what makes Back cross between a folder and a category page.
 * (`embedded` is still passed by the host and kept for signature
 * compatibility.)
 */
export default function ControlPanel({
  onSetHeader,
  onShellOpen,
  embedded,
  hideTaskPane,
  view: viewProp,
  onNavigate,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  // The host owns navigation history; the view arrives as a prop and every
  // internal navigation is reported back up.
  // view: 'home' | 'classic' | 'cat:<key>' | 'ua-home' | 'ua-create' |
  //       'ua-change' | 'datetime'
  const view = viewProp || 'home';
  const navigate = v => {
    if (onNavigate) onNavigate(v);
  };

  const [selectedUser, setSelectedUser] = useState(null);
  // getFastBoot reads localStorage, which React cannot observe.
  const [, setUaLogonTick] = useState(0);
  const [usersTick, setUsersTick] = useState(0);
  const [folderOptionsOpen, setFolderOptionsOpen] = useState(false);

  useEffect(() => {
    if (typeof usersApi.subscribeUsers !== 'function') return undefined;
    const unsub = usersApi.subscribeUsers(() => setUsersTick(t => t + 1));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!onSetHeader || embedded) return;
    onSetHeader({
      title: view.startsWith('ua') ? 'User Accounts' : 'Control Panel',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const users = useMemo(
    () => safe(usersApi.listUsers, []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usersTick],
  );
  const currentUser = safe(usersApi.getCurrentUserName, 'Skillz');
  const avatars = usersApi.AVATARS || {};
  // getAvatar understands custom (data URL) pictures as well as the keys
  const avatarSrc = key =>
    safe(() => usersApi.getAvatar(key), null) ||
    avatars[key] ||
    Object.values(avatars)[0] ||
    '';

  const openCategory = cat => {
    if (cat.key === 'appearance' || cat.key === 'users') {
      if (cat.key === 'users') navigate('ua-home');
      else if (onShellOpen) onShellOpen(DESK_CPL);
      return;
    }
    if (cat.key === 'datetime') {
      navigate('datetime');
      return;
    }
    navigate(`cat:${cat.key}`);
  };

  // --- User Accounts flows ---

  /*
   * Refuses anything that would pull a profile out from under a live
   * session. Checks every logged-on account, not just the one on screen:
   * a switched-out desktop is still mounted and still writing to its own
   * folder, so renaming or deleting it breaks a session you cannot see.
   */
  const refuseIfLoggedOn = (user, verb) => {
    if (!safe(() => usersApi.isUserLoggedOn(user.name), false)) return false;
    dlg.alert(
      `Windows cannot ${verb} the account of a user who is currently ` +
        `logged on. Log ${user.name} off, and then try again.`,
      'User Accounts',
      { icon: 'warning' },
    );
    return true;
  };

  /*
   * Turning Guest off deletes the account outright, files and all — this
   * desktop has no notion of an account that exists but cannot log in, and
   * inventing one would mean teaching the logon screen to hide it. Saying
   * so plainly is better than a switch that quietly loses somebody's work.
   */
  const toggleGuest = async () => {
    const guest = usersApi.findGuestUser();
    if (guest) {
      // Turning it off deletes it, so every rule that guards a deletion
      // applies: not while somebody is using it, including whoever is
      // asking, and not if its owner put a password on it.
      if (refuseIfLoggedOn(guest, 'turn off')) return;
      if (lockedByOwner(guest)) {
        dlg.alert(
          `The Guest account is password protected. Only ${guest.name} ` +
            `can turn it off, or remove the password first.`,
          'User Accounts',
          { icon: 'warning' },
        );
        return;
      }
      const ok = await dlg.confirm(
        [
          `Turn off the Guest account (${guest.name})?`,
          '',
          'The account and everything saved in it will be deleted. The',
          'guest link will create a fresh one next time it is used.',
        ].join('\n'),
        'User Accounts',
      );
      if (!ok) return;
      usersApi.deleteUser(guest.name);
      setUaLogonTick(t => t + 1);
      return;
    }
    if (!usersApi.ensureGuestUser()) {
      dlg.alert(
        'This computer already has as many accounts as it can hold.',
        'User Accounts',
        { icon: 'warning' },
      );
      return;
    }
    setUaLogonTick(t => t + 1);
  };

  const doDelete = async user => {
    if (lockedByOwner(user)) {
      dlg.alert(
        `This account is password protected. Only ${user.name} can ` +
          `delete it.`,
        'User Accounts',
        { icon: 'warning' },
      );
      return;
    }
    if (refuseIfLoggedOn(user, 'delete')) return;
    if (users.length <= 1) {
      dlg.alert(
        'Windows requires at least one user account on this computer.',
        'User Accounts',
        { icon: 'warning' },
      );
      return;
    }
    const yes = await dlg.confirm(
      `Are you sure you want to delete ${user.name}'s account?\n\n${user.name}'s documents and settings on this computer will be removed.`,
      'Confirm Account Deletion',
    );
    if (!yes) return;
    const res = safe(() => usersApi.deleteUser(user.name), { ok: false });
    // And their files: the account record alone does not cover the
    // profile tree, which is why deleted accounts left theirs behind.
    if (!res || res.ok !== false) {
      safe(() => vfs.deleteUserProfile(user.name), false);
    }
    if (res && res.ok === false) {
      dlg.alert(
        res.error || 'The account could not be deleted.',
        'User Accounts',
        { icon: 'error' },
      );
    } else {
      setSelectedUser(null);
      navigate('ua-home');
    }
  };

  const doRename = async user => {
    if (lockedByOwner(user)) {
      dlg.alert(
        `This account is password protected. Only ${user.name} can ` +
          `rename it.`,
        'User Accounts',
        { icon: 'warning' },
      );
      return;
    }
    /*
     * Not while they are logged on. The profile tree lives at
     * C:/Documents and Settings/<name>, and a live session resolves its
     * paths and guards its ntuser.dat writes against the account name it
     * mounted with — rename underneath it and the desktop keeps writing to
     * a folder the account no longer claims. Delete already refuses for
     * the same reason; rename slipped through.
     */
    /*
     * XP let you rename your own account, and so does this — it just has
     * to end the session to do it. The desktop is keyed on the account
     * name and resolves every path through it, so the tidy way to change
     * it underneath is not to be running at the time.
     *
     * Somebody else's live session is still refused: their windows are
     * mounted and writing, and this side cannot restart a session it does
     * not own.
     */
    const isSelf = user.name === currentUser;
    if (!isSelf && refuseIfLoggedOn(user, 'rename')) return;
    const next = await dlg.prompt(
      `Type a new name for ${user.name}:`,
      user.name,
      'Rename Account',
    );
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === user.name) return;
    if (isSelf) {
      const go = await dlg.confirm(
        [
          `Rename your account to ${trimmed}?`,
          '',
          'Windows will log you off to finish renaming it. Save anything',
          'you are working on first — open windows will close.',
        ].join('\n'),
        'User Accounts',
      );
      if (!go) return;
    }
    const res = safe(() => usersApi.renameUser(user.name, trimmed), {
      ok: false,
    });
    if (res && res.ok === false) {
      dlg.alert(
        res.error === 'exists'
          ? `The account name ${trimmed} is already in use. Type a different name.`
          : res.error || 'The account could not be renamed.',
        'User Accounts',
        { icon: 'error' },
      );
    } else {
      /*
       * The account record moved; the files have to follow. Without this
       * the profile stays at Documents and Settings/<old name> and the
       * account comes back on next login looking factory-new, with
       * everything it had stranded under a folder nothing points at.
       *
       * False means the account had no profile yet, which is normal for
       * one that has never logged in.
       */
      safe(() => vfs.renameUserProfile(user.name, trimmed), false);
      setSelectedUser({ ...user, name: trimmed });
      if (isSelf) {
        // renameUser only migrates the active pointer when nobody is
        // logged on, so the next logon needs telling who to expect.
        safe(() => usersApi.setActiveUser(trimmed), null);
        safe(() => requestPower('logoff'), null);
      }
    }
  };

  /*
   * Every account here is an administrator, so XP would let any of them
   * reset another's password. That is faithful, and it is also the end of
   * passwords meaning anything: the point is that somebody at this
   * keyboard on another account cannot get into yours, and overwriting
   * the password defeats exactly that.
   *
   * Demanding the target's current password would be no safeguard either
   * — anyone who knows it can simply log in. So the rule is the simple
   * one: your own account only.
   */
  /*
   * A password on an account somebody else owns puts the whole account out
   * of reach, not just its password — renaming it, deleting it and
   * changing its picture are all things the owner would not want a passer-
   * by doing. Without that, a password stops nothing: you could simply
   * delete the account you could not log into.
   *
   * An account with no password stays open, because nobody asked for it to
   * be otherwise.
   */
  const lockedByOwner = user =>
    user.name !== currentUser &&
    safe(() => usersApi.userHasPassword(user.name), false);

  const ownAccountOnly = user => {
    if (user.name === currentUser) return true;
    dlg.alert(
      `Only ${user.name} can change the password for this account. Log ` +
        `on as ${user.name} to change it.`,
      'User Accounts',
      { icon: 'warning' },
    );
    return false;
  };

  const doRemovePassword = async user => {
    if (!ownAccountOnly(user)) return;
    const yes = await dlg.confirm(
      `Are you sure you want to remove ${user.name}'s password?`,
      'User Accounts',
    );
    if (!yes) return;
    safe(() => usersApi.setUserPassword(user.name, ''), null);
    setUsersTick(t => t + 1);
  };

  // The account whose picture is being browsed for, while the VFS Open
  // dialog is up
  const [picturePickerUser, setPicturePickerUser] = useState(null);
  const onPicturePicked = async path => {
    const user = picturePickerUser;
    setPicturePickerUser(null);
    if (!user) return;
    try {
      const blob = await vfs.readBinaryFile(path);
      if (!blob) throw new Error('unreadable');
      doChangePicture(user, await fileToAccountPicture(blob));
    } catch {
      dlg.alert(
        'That file could not be used as a picture. Choose a different image file.',
        'User Accounts',
        { icon: 'error' },
      );
    }
  };

  const doChangePicture = (user, key) => {
    if (typeof usersApi.setUserAvatar === 'function') {
      usersApi.setUserAvatar(user.name, key);
    } else if (typeof usersApi.updateUserAvatar === 'function') {
      usersApi.updateUserAvatar(user.name, key);
    } else if (typeof usersApi.setUserSetting === 'function') {
      usersApi.setUserSetting(user.name, 'avatarKey', key);
    }
    setSelectedUser({ ...user, avatarKey: key });
    setUsersTick(t => t + 1);
  };

  // --- Renderers ---

  const renderTaskPane = () => (
    <div className="cp__pane">
      <div className="cp__card">
        <div className="cp__card-header">
          <img
            src={getArt('ControlPanel', controlIcon)}
            alt=""
            width={22}
            height={22}
          />
          <span>Control Panel</span>
        </div>
        <div className="cp__card-body">
          {view === 'classic' ? (
            <div className="cp__link" onClick={() => navigate('home')}>
              Switch to Category View
            </div>
          ) : (
            <div className="cp__link" onClick={() => navigate('classic')}>
              Switch to Classic View
            </div>
          )}
        </div>
      </div>
      <div className="cp__card">
        <div className="cp__card-header">
          <span>See Also</span>
        </div>
        <div className="cp__card-body">
          <div
            className="cp__link"
            onClick={() =>
              onShellOpen &&
              onShellOpen(`${SPECIAL_FOLDERS.FAVORITES}/Windows Update.url`)
            }
          >
            <img src={updateIcon} alt="" width={16} height={16} />
            Windows Update
          </div>
          <div className="cp__link cp__link--inert">
            <img src={helpIcon} alt="" width={16} height={16} />
            Help and Support
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="cp__main cp__main--home">
      <div className="cp__title">Pick a category</div>
      <div className="cp__grid">
        {CATEGORIES.map(cat => (
          <div
            key={cat.key}
            className="cp__tile"
            onClick={() => openCategory(cat)}
          >
            <cat.Icon size={44} />
            <span className="cp__tile-label">{cat.label}</span>
          </div>
        ))}
      </div>
      <Watermark />
    </div>
  );

  const renderClassic = () => (
    <div className="cp__main">
      <div className="cp__classic-grid">
        {CLASSIC_APPLETS.map(a => (
          <div
            key={a.label}
            className="cp__applet"
            onDoubleClick={() => {
              if (a.open && onShellOpen) onShellOpen(a.open);
              else if (a.view) navigate(a.view);
              else if (a.dialog === 'folder-options')
                setFolderOptionsOpen(true);
            }}
          >
            <a.Icon size={34} />
            <span>{a.label}</span>
          </div>
        ))}
      </div>
      <Watermark />
    </div>
  );

  const renderCategoryPage = key => {
    const cat = CATEGORIES.find(c => c.key === key);
    if (!cat) return null;
    return (
      <div className="cp__main">
        <div className="cp__cat-header">
          <cat.Icon size={44} />
          <span className="cp__cat-title">{cat.label}</span>
        </div>
        <div className="cp__subtitle">Pick a task...</div>
        <div className="cp__tasks">
          {cat.tasks.map(t => {
            const open = cat.taskActions && cat.taskActions[t];
            return (
              <div
                key={t}
                className={open ? 'cp__task' : 'cp__task cp__task--inert'}
                onClick={
                  open ? () => onShellOpen && onShellOpen(open) : undefined
                }
              >
                <span className="cp__task-arrow">→</span>
                {t}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUaHome = () => (
    <div className="cp__main cp__main--ua">
      <div className="cp__ua-banner">
        <UserAccountsIcon size={38} />
        <span>User Accounts</span>
      </div>
      <div className="cp__subtitle">Pick a task...</div>
      <div className="cp__tasks">
        <div className="cp__task" onClick={() => navigate('ua-create')}>
          <span className="cp__task-arrow">→</span>
          Create a new account
        </div>
        <div className="cp__task" onClick={() => navigate('ua-logon')}>
          <span className="cp__task-arrow">→</span>
          Change the way users log on or off
        </div>
        <div className="cp__task" onClick={toggleGuest}>
          <span className="cp__task-arrow">→</span>
          {usersApi.isGuestEnabled()
            ? 'Turn off the Guest account'
            : 'Turn on the Guest account'}
        </div>
      </div>
      <div className="cp__subtitle">or pick an account to change</div>
      <div className="cp__ua-grid">
        {users.map(u => (
          <div
            key={u.name}
            className="cp__ua-tile"
            onClick={() => {
              setSelectedUser(u);
              navigate('ua-change');
            }}
          >
            <img src={avatarSrc(u.avatarKey)} alt="" width={48} height={48} />
            <div>
              <div className="cp__ua-name">{u.name}</div>
              <div className="cp__ua-kind">
                Computer administrator
                {/*
                  Every live session, not just the one on screen. Fast user
                  switching keeps switched-out desktops mounted and they are as
                  logged on as the visible one, so the guards here refuse to
                  touch any of them.
                */}
                {safe(() => usersApi.isUserLoggedOn(u.name), false)
                  ? u.name === currentUser
                    ? ' \u2014 logged on (current user)'
                    : ' \u2014 logged on'
                  : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUaCreate = () => (
    <UaCreatePage
      avatars={avatars}
      dlg={dlg}
      vfs={vfs}
      onDone={() => {
        setUsersTick(t => t + 1);
        navigate('ua-home');
      }}
      onCancel={() => navigate('ua-home')}
    />
  );

  const renderUaChange = () => {
    const user = users.find(u => selectedUser && u.name === selectedUser.name)
      ? users.find(u => u.name === selectedUser.name)
      : selectedUser;
    if (!user) return renderUaHome();
    return (
      <div className="cp__main cp__main--ua">
        <div className="cp__ua-banner">
          <img src={avatarSrc(user.avatarKey)} alt="" width={38} height={38} />
          <span>What do you want to change about {user.name}'s account?</span>
        </div>
        <div className="cp__tasks">
          {!lockedByOwner(user) && (
            <>
              <div className="cp__task" onClick={() => doRename(user)}>
                <span className="cp__task-arrow">→</span>
                Change the name
              </div>
              <div className="cp__task" onClick={() => doDelete(user)}>
                <span className="cp__task-arrow">→</span>
                Delete the account
              </div>
            </>
          )}
          {/*
            Password actions only on your own account. Not what XP did —
            every account here is an administrator and XP let those reset
            each other — but a password anyone else can overwrite is not
            protecting anything. Whether the account HAS one still shows,
            because that is useful and not a secret.
          */}
          {user.name !== currentUser ? (
            <div className="cp__pw-note">
              {lockedByOwner(user)
                ? `This account is password protected. Only ${user.name} can ` +
                  `change it. To let anyone else manage this account, ` +
                  `${user.name} can log on and remove the password.`
                : `Only ${user.name} can create a password for this account.`}
            </div>
          ) : safe(() => usersApi.userHasPassword(user.name), false) ? (
            <>
              <div className="cp__task" onClick={() => navigate('ua-password')}>
                <span className="cp__task-arrow">→</span>
                Change the password
              </div>
              <div className="cp__task" onClick={() => doRemovePassword(user)}>
                <span className="cp__task-arrow">→</span>
                Remove the password
              </div>
            </>
          ) : (
            <div className="cp__task" onClick={() => navigate('ua-password')}>
              <span className="cp__task-arrow">→</span>
              Create a password
            </div>
          )}
        </div>
        {!lockedByOwner(user) && (
          <>
            <div className="cp__subtitle">Pick a new picture:</div>
        <div className="cp__avatar-grid">
          {usersApi.isCustomAvatar(user.avatarKey) && (
            <img
              src={user.avatarKey}
              alt=""
              width={48}
              height={48}
              className="cp__avatar cp__avatar--sel"
            />
          )}
          {Object.entries(avatars).map(([key, src]) => (
            <img
              key={key}
              src={src}
              alt=""
              width={48}
              height={48}
              className={
                key === user.avatarKey
                  ? 'cp__avatar cp__avatar--sel'
                  : 'cp__avatar'
              }
              onClick={() => doChangePicture(user, key)}
            />
          ))}
        </div>
            <div
              className="cp__task"
              onClick={() => setPicturePickerUser(user)}
            >
              <span className="cp__task-arrow">→</span>
              Browse for more pictures...
            </div>
          </>
        )}
        {picturePickerUser && picturePickerUser.name === user.name && (
          <FileDialog
            mode="open"
            title="Browse for more pictures"
            initialPath={SPECIAL_FOLDERS.MY_PICTURES}
            filters={PICTURE_FILTERS}
            onSelect={onPicturePicked}
            onCancel={() => setPicturePickerUser(null)}
          />
        )}
        <div className="cp__buttons">
          <XPButton onClick={() => navigate('ua-home')}>Back</XPButton>
        </div>
      </div>
    );
  };

  const renderUaPassword = () => {
    const user = users.find(u => selectedUser && u.name === selectedUser.name)
      ? users.find(u => u.name === selectedUser.name)
      : selectedUser;
    if (!user) return renderUaHome();
    // Belt and braces: the tasks are hidden for other accounts, and the
    // view refuses to render for one however it was reached.
    if (user.name !== currentUser) return renderUaChange();
    return (
      <UaPasswordPage
        user={user}
        hasPw={safe(() => usersApi.userHasPassword(user.name), false)}
        initialHint={safe(() => usersApi.getPasswordHint(user.name), '')}
        avatarSrc={avatarSrc}
        dlg={dlg}
        onDone={() => {
          setUsersTick(t => t + 1);
          navigate('ua-change');
        }}
        onCancel={() => navigate('ua-change')}
      />
    );
  };

  /*
   * Where XP kept the logon options. Its own two checkboxes (the Welcome
   * screen, Fast User Switching) are not choices here — this desktop has one
   * logon style and always keeps switched-out sessions alive — so the page
   * carries the one setting that is ours.
   */
  const renderUaLogon = () => {
    const on = usersApi.getFastBoot();
    return (
      <div className="cp__main cp__main--ua">
        <div className="cp__ua-banner">
          <UserAccountsIcon size={38} />
          <span>User Accounts</span>
        </div>
        <div className="cp__subtitle">Select logon and logoff options</div>

        <label className="cp__check">
          <input
            type="checkbox"
            checked={on}
            onChange={e => {
              usersApi.setFastBoot(e.target.checked);
              setUaLogonTick(t => t + 1);
            }}
          />
          <span>Skip the startup screen</span>
        </label>
        <p className="cp__hint">
          Windows will go straight to the list of users when it starts,
          instead of showing the startup screen first. You still choose your
          account, which is what lets the startup sound play — most browsers
          will not play any sound until you click something.
        </p>
      </div>
    );
  };

  const renderDateTime = () => <DateTimePanel />;

  const content = () => {
    if (view === 'home') return renderHome();
    if (view === 'classic') return renderClassic();
    if (view === 'ua-home') return renderUaHome();
    if (view === 'ua-create') return renderUaCreate();
    if (view === 'ua-change') return renderUaChange();
    if (view === 'ua-password') return renderUaPassword();
    if (view === 'ua-logon') return renderUaLogon();
    if (view === 'datetime') return renderDateTime();
    if (view.startsWith('cat:')) return renderCategoryPage(view.slice(4));
    return renderHome();
  };

  return (
    <Root>
      <div className="cp__body">
        {!hideTaskPane && renderTaskPane()}
        {content()}
      </div>
      {folderOptionsOpen && (
        <FolderOptions onClose={() => setFolderOptionsOpen(false)} />
      )}
    </Root>
  );
}

/** Live clock + current month calendar (display-only, like a glance at
 *  timedate.cpl — the system clock is the browser's). */
function DateTimePanel() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    zone = '';
  }
  return (
    <div className="cp__main">
      <div className="cp__cat-header">
        <DateTimeIcon size={44} />
        <span className="cp__cat-title">Date and Time</span>
      </div>
      <div className="cp__dt">
        <div className="cp__dt-cal">
          <div className="cp__dt-month">
            {now.toLocaleString('en-US', { month: 'long' })} {year}
          </div>
          <div className="cp__dt-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`h${i}`} className="cp__dt-cell cp__dt-cell--head">
                {d}
              </div>
            ))}
            {cells.map((d, i) => (
              <div
                key={i}
                className={
                  d === now.getDate()
                    ? 'cp__dt-cell cp__dt-cell--today'
                    : 'cp__dt-cell'
                }
              >
                {d || ''}
              </div>
            ))}
          </div>
        </div>
        <div className="cp__dt-clock">
          <div className="cp__dt-time">{now.toLocaleTimeString('en-US')}</div>
          <div className="cp__dt-zone">{zone}</div>
          <div className="cp__dt-note">
            Date and time follow this computer's clock.
          </div>
        </div>
      </div>
    </div>
  );
}
