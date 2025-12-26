package com.loidi.ya_tua

 import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import com.loidi.ya_tua.TauriActivity

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
