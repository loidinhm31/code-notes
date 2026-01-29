package com.loidinh.codenotes

 import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import com.loidinh.codenotes.TauriActivity

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
